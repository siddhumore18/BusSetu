import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ user:'postgres', password:'236810', host:'localhost', port:5433, database:'kmt_bus' });

try {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Tables:', tables.rows.map(x => x.table_name));

  // Try a query on routes
  try {
    const routes = await pool.query("SELECT COUNT(*) FROM routes");
    console.log('Routes count:', routes.rows[0]);
  } catch(e) { console.error('Routes table error:', e.message); }

  // Try a query on stops
  try {
    const stops = await pool.query("SELECT COUNT(*) FROM stops");
    console.log('Stops count:', stops.rows[0]);
  } catch(e) { console.error('Stops table error:', e.message); }

  // Try trips with joins
  try {
    const trips = await pool.query(`
      SELECT t.id, t.status, b.bus_number, u.name as driver_name, r.route_name,
        l.latitude as current_lat, l.longitude as current_lng, l.speed
      FROM trips t
      LEFT JOIN buses b ON t.bus_id = b.id
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN routes r ON t.route_id = r.id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, speed FROM locations
        WHERE trip_id = t.id ORDER BY timestamp DESC LIMIT 1
      ) l ON true
      WHERE t.status = 'active'
    `);
    console.log('Active trips query OK, count:', trips.rowCount);
  } catch(e) { console.error('Trips query error:', e.message); }

} catch(e) {
  console.error('Error:', e.message);
}
await pool.end();
