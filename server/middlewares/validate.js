export const validate =
    (schema) =>
        (req, res, next) => {
            const parsed = schema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ success: false, message: "Invalid request", errors: parsed.error.issues });
            }
            req.validated = parsed.data; // attach typed/clean data
            next();
        };