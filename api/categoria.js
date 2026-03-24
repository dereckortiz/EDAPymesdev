const express = require("express");

module.exports = (db) => {
    const router = express.Router();

    /* =========================
       OBTENER TODAS LAS CATEGORÍAS
    ========================= */
    router.get("/", (req, res) => {
        db.all("SELECT * FROM categorias", (err, rows) => {
            if (err) return res.status(500).json(err);
            res.json(rows);
        });
    });

    /* =========================
       CREAR CATEGORÍA
    ========================= */
    router.post("/", (req, res) => {
        const { nombre } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: "Nombre requerido" });
        }

        db.run(
            "INSERT INTO categorias(nombre) VALUES(?)",
            [nombre],
            function (err) {
                if (err) return res.status(500).json(err);
                res.json({ id: this.lastID, nombre });
            }
        );
    });

    /* =========================
       ELIMINAR CATEGORÍA
    ========================= */
    router.delete("/:id", (req, res) => {
        db.run(
            "DELETE FROM categorias WHERE id = ?",
            [req.params.id],
            function (err) {
                if (err) return res.status(500).json(err);
                res.json({ ok: true });
            }
        );
    });

    return router;
};