
import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
    console.log(`server running on :${PORT}`);
});