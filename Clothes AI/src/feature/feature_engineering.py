# src/features/feature_engineering.py
import re
import json
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional, Tuple

import numpy as np
import pandas as pd


def _normalize_text(s: pd.Series) -> pd.Series:
    return (
        s.fillna("unknown")
        .astype(str)
        .str.strip()
        .str.lower()
    )


def _split_category_name(cat: pd.Series) -> Tuple[pd.Series, pd.Series, pd.Series]:
    parts = cat.fillna("unknown/unknown/unknown").str.split("/", n=2, expand=True)
    if parts.shape[1] < 3:
        while parts.shape[1] < 3:
            parts[parts.shape[1]] = "unknown"
    cat1 = parts[0].fillna("unknown").replace("", "unknown")
    cat2 = parts[1].fillna("unknown").replace("", "unknown")
    cat3 = parts[2].fillna("unknown").replace("", "unknown")
    return cat1, cat2, cat3


@dataclass
class FeatureEngineerConfig:
    # rarity thresholds
    min_brand_low: int = 10          # <10 -> __other__
    min_brand_mid: int = 50          # 10..49 -> __mid__
    min_cat3: int = 50               # <50 -> __other_cat3

    # options
    add_brand_bucket: bool = True
    replace_rare_brands: bool = False
    make_log_price: bool = True

    # popularity
    top_n_popular_brands: int = 100  # how many brands to flag as popular

    # keyword flags
    new_keywords: Tuple[str, ...] = ("nwt", "brand new", "new with tags", "sealed", "unworn")
    vintage_keywords: Tuple[str, ...] = ("vintage", "retro", "y2k", "90s", "80s")


class FeatureEngineer:
    """
    Fit on TRAIN ONLY (build frequency maps and rarity thresholds),
    then transform on train/val/test using the learned artifacts.
    """
    def __init__(self, config: Optional[FeatureEngineerConfig] = None):
        self.config = config or FeatureEngineerConfig()

        # Learned artifacts
        self.brand_counts_: Optional[Dict[str, int]] = None
        self.cat3_counts_: Optional[Dict[str, int]] = None
        self.rare_low_brands_: Optional[set] = None
        self.rare_mid_brands_: Optional[set] = None
        self.rare_cat3_: Optional[set] = None

        # New artifacts
        self.cat1_median_price_: Optional[Dict[str, float]] = None
        self.global_median_price_: Optional[float] = None
        self.top_brands_: Optional[set] = None

    # ------------------------ public API ------------------------

    def fit(self, df: pd.DataFrame) -> "FeatureEngineer":
        """
        Fit frequency maps, rarity buckets, popularity sets, and price anchors using TRAIN ONLY.
        """
        df = df.copy()

        # Normalize core text fields
        df["name"] = _normalize_text(df.get("name", pd.Series(index=df.index, dtype=object)))
        df["item_description"] = _normalize_text(df.get("item_description", pd.Series(index=df.index, dtype=object)))
        df["brand_name"] = _normalize_text(df.get("brand_name", pd.Series(index=df.index, dtype=object)))
        df["category_name"] = _normalize_text(df.get("category_name", pd.Series(index=df.index, dtype=object)))

        # Split categories
        cat1, cat2, cat3 = _split_category_name(df["category_name"])

        # Build counts (brand & cat3)
        brand_counts = df["brand_name"].value_counts()
        cat3_counts = cat3.value_counts()

        # Determine rare sets using thresholds
        rare_low = set(brand_counts[brand_counts < self.config.min_brand_low].index)
        rare_mid = set(
            brand_counts[
                (brand_counts >= self.config.min_brand_low) &
                (brand_counts < self.config.min_brand_mid)
                ].index
        )
        rare_cat3 = set(cat3_counts[cat3_counts < self.config.min_cat3].index)

        # Popular brands (top-N by frequency)
        top_brands = set(brand_counts.head(self.config.top_n_popular_brands).index)

        # Price anchors by cat1
        price_series = pd.to_numeric(df.get("price"), errors="coerce")
        # compute per-cat1 median price (ignore NaNs)
        cat1_df = pd.DataFrame({"cat1": cat1, "price": price_series})
        cat1_median = (
            cat1_df.dropna(subset=["price"])
            .groupby("cat1")["price"]
            .median()
            .to_dict()
        )
        global_median = float(np.nanmedian(price_series.values)) if price_series.notna().any() else 0.0

        # Store artifacts
        self.brand_counts_ = brand_counts.to_dict()
        self.cat3_counts_ = cat3_counts.to_dict()
        self.rare_low_brands_ = rare_low
        self.rare_mid_brands_ = rare_mid
        self.rare_cat3_ = rare_cat3
        self.top_brands_ = top_brands
        self.cat1_median_price_ = cat1_median
        self.global_median_price_ = global_median

        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply learned artifacts to ANY SPLIT (train/val/test).
        """
        assert self.brand_counts_ is not None, "Call fit() on train_df before transform()."

        out = df.copy()

        # ---- normalize base text columns
        out["name"] = _normalize_text(out.get("name", pd.Series(index=out.index, dtype=object)))
        out["item_description"] = _normalize_text(out.get("item_description", pd.Series(index=out.index, dtype=object)))
        out["brand_name"] = _normalize_text(out.get("brand_name", pd.Series(index=out.index, dtype=object)))
        out["category_name"] = _normalize_text(out.get("category_name", pd.Series(index=out.index, dtype=object)))

        # ---- category splits
        out["cat1"], out["cat2"], out["cat3"] = _split_category_name(out["category_name"])

        # ---- text length & richness features
        out["name_len"] = out["name"].str.split().apply(len).astype("int32")
        out["desc_len"] = out["item_description"].str.split().apply(len).astype("int32")
        # unique token ratio in description
        def _uniq_ratio(s: str) -> float:
            if not s or s == "unknown":
                return 0.0
            toks = s.split()
            if len(toks) == 0:
                return 0.0
            return len(set(toks)) / float(len(toks))
        out["desc_unique_ratio"] = out["item_description"].apply(_uniq_ratio).astype("float32")

        # ---- keyword flags
        new_re = re.compile("|".join(map(re.escape, self.config.new_keywords)))
        vintage_re = re.compile("|".join(map(re.escape, self.config.vintage_keywords)))
        out["is_new"] = (out["name"].str.contains(new_re) | out["item_description"].str.contains(new_re)).astype("int8")
        out["is_vintage"] = (out["name"].str.contains(vintage_re) | out["item_description"].str.contains(vintage_re)).astype("int8")

        # ---- year flag (very lightweight)
        year_re = re.compile(r"\b(19[5-9]\d|20[0-2]\d)\b")
        out["year_present"] = (out["name"].str.contains(year_re) |
                               out["item_description"].str.contains(year_re)).astype("int8")

        # ---- brand rarity bucket + freq feature (using train counts)
        brand_count_map = self.brand_counts_
        counts = out["brand_name"].map(brand_count_map).fillna(0).astype(int)

        if self.config.add_brand_bucket:
            out["brand_bucket"] = np.select(
                [
                    out["brand_name"].isin(self.rare_low_brands_),
                    out["brand_name"].isin(self.rare_mid_brands_),
                ],
                ["__other__", "__mid__"],
                default="__freq__",
            ).astype(object)

        # optional overwrite brand_name with rarity buckets
        if self.config.replace_rare_brands:
            low_mask = out["brand_name"].isin(self.rare_low_brands_)
            mid_mask = out["brand_name"].isin(self.rare_mid_brands_)
            out.loc[low_mask, "brand_name"] = "__other__"
            out.loc[mid_mask & ~low_mask, "brand_name"] = "__mid__"

        # numeric brand frequency (log-scaled)
        out["brand_freq"] = np.log1p(counts).astype("float32")

        # ---- popular brand flag
        out["is_popular_brand"] = out["brand_name"].isin(self.top_brands_ or set()).astype("int8")

        # ---- rare cat3 bucket
        out.loc[out["cat3"].isin(self.rare_cat3_), "cat3"] = "__other_cat3__"

        # ---- category x brand bucket interaction (string cat for OHE)
        if "brand_bucket" in out.columns:
            out["cat1_brand_bucket"] = (out["cat1"].astype(str) + "|" + out["brand_bucket"].astype(str)).astype(object)
        else:
            out["cat1_brand_bucket"] = (out["cat1"].astype(str) + "|_no_bucket_").astype(object)

        # ---- condition (keep numeric)
        if "item_condition_id" in out.columns:
            out["item_condition_id"] = pd.to_numeric(out["item_condition_id"], errors="coerce").fillna(0).astype("int8")

        # ---- cat1 median price anchor (independent of item price)
        cat1_median_map = self.cat1_median_price_ or {}
        global_med = self.global_median_price_ if self.global_median_price_ is not None else 0.0
        out["cat1_median_price"] = out["cat1"].map(cat1_median_map).fillna(global_med).astype("float32")

        # ---- target (if present)
        if self.config.make_log_price and "price" in out.columns:
            out["price"] = pd.to_numeric(out["price"], errors="coerce")
            out["log_price"] = np.log1p(out["price"])

        # safety: fill any residual NaNs in engineered columns
        for col in ["cat1", "cat2", "cat3", "brand_name"]:
            if col in out.columns:
                out[col] = out[col].fillna("unknown")
        for col in [
            "name_len", "desc_len", "desc_unique_ratio",
            "is_new", "is_vintage", "year_present",
            "brand_freq", "is_popular_brand", "cat1_median_price"
        ]:
            if col in out.columns:
                out[col] = out[col].fillna(0)

        return out

    # ------------------------ persistence ------------------------

    def save(self, path: str) -> None:
        """
        Save artifacts to JSON file.
        """
        payload: Dict[str, Any] = {
            "config": asdict(self.config),
            "brand_counts": self.brand_counts_,
            "cat3_counts": self.cat3_counts_,
            "rare_low_brands": sorted(list(self.rare_low_brands_ or [])),
            "rare_mid_brands": sorted(list(self.rare_mid_brands_ or [])),
            "rare_cat3": sorted(list(self.rare_cat3_ or [])),
            "top_brands": sorted(list(self.top_brands_ or [])),
            "cat1_median_price": self.cat1_median_price_ or {},
            "global_median_price": self.global_median_price_,
        }
        with open(path, "w") as f:
            json.dump(payload, f)

    @classmethod
    def load(cls, path: str) -> "FeatureEngineer":
        """
        Load artifacts from JSON file.
        """
        with open(path, "r") as f:
            payload = json.load(f)

        fe = cls(FeatureEngineerConfig(**payload["config"]))
        fe.brand_counts_ = {k: int(v) for k, v in (payload.get("brand_counts") or {}).items()}
        fe.cat3_counts_ = {k: int(v) for k, v in (payload.get("cat3_counts") or {}).items()}
        fe.rare_low_brands_ = set(payload.get("rare_low_brands") or [])
        fe.rare_mid_brands_ = set(payload.get("rare_mid_brands") or [])
        fe.rare_cat3_ = set(payload.get("rare_cat3") or [])
        fe.top_brands_ = set(payload.get("top_brands") or [])
        fe.cat1_median_price_ = {k: float(v) for k, v in (payload.get("cat1_median_price") or {}).items()}
        fe.global_median_price_ = float(payload.get("global_median_price") or 0.0)
        return fe