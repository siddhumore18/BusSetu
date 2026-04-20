import pool from "../config/db.js";

export const addStop = async (req, res) => {
    try {
        const { stop_name, latitude, longitude, route_id, stop_order } = req.body;
        if (!stop_name || !latitude || !longitude || !route_id || !stop_order) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const result = await pool.query(
            "INSERT INTO stops (stop_name, latitude, longitude, route_id, stop_order) VALUES ($1,$2,$3,$4,$5) RETURNING *",
            [stop_name.trim(), latitude, longitude, route_id, stop_order]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getStopsByRoute = async (req, res) => {
    try {
        const { routeId } = req.params;
        const result = await pool.query(
            "SELECT * FROM stops WHERE route_id=$1 ORDER BY stop_order ASC",
            [routeId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getAllStops = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.*, r.route_name FROM stops s
             LEFT JOIN routes r ON s.route_id = r.id
             ORDER BY s.route_id, s.stop_order ASC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteStop = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM stops WHERE id=$1", [id]);
        res.json({ message: "Stop deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
