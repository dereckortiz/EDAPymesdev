const express = require("express");

module.exports = (db, upload) => {
    const router = express.Router();

    /* LISTAR */
    router.get("/", (req, res) => {
        db.all("SELECT * FROM productos", (err, rows) => {
            if (err) return res.status(500).json(err);
            res.json(rows);
        });
    });

    /* CREAR */
    router.post("/", upload.single("imagen"), (req, res) => {
        const { nombre, precio, categoria } = req.body;
        const imagen = req.file ? `/uploads/${req.file.filename}` : null;

        db.run(
            "INSERT INTO productos(nombre,precio,categoria,imagen) VALUES(?,?,?,?)",
            [nombre, precio, categoria, imagen],
            function (err) {
                if (err) return res.status(500).json(err);
                res.json({ id: this.lastID });
            }
        );
    });

    /* ELIMINAR */
    router.delete("/:id", (req, res) => {
        db.run("DELETE FROM productos WHERE id = ?", [req.params.id], err => {
            if (err) return res.status(500).json(err);
            res.json({ ok: true });
        });
    });

    return router;
};