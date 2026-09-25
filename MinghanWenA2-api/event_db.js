/**
 * @fileoverview Database Connection & Operations Module
 * Manages the MySQL connection pool and provides interface functions 
 * to retrieve charity event data for the API.
 * 
 * @module event_db
 * @requires mysql2/promise
 * @requires dotenv
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Creates a MySQL connection pool.
 * Uses environment variables for configuration to ensure security and flexibility.
 * 
 * @type {mysql.Pool}
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10 // Maximum number of concurrent connections
});

/**
 * Tests the database connection.
 * Attempts to acquire a connection from the pool and send a ping request.
 * 
 * @async
 * @function testConnection
 * @returns {Promise<void>} Resolves if connection is successful; logs success message.
 * @throws {Error} If the database cannot be reached.
 */
async function testConnection() {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ DB connected');
}

/**
 * Executes a generic SQL query with parameterized inputs.
 * Wraps pool.execute to prevent SQL injection and simplify row extraction.
 * 
 * @async
 * @function query
 * @param {string} sql - The SQL statement to execute, supporting placeholders (?).
 * @param {Array} [params=[]] - An array of values to replace the placeholders in the SQL statement.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of result rows.
 */
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

/**
 * Retrieves all active and upcoming events for the Home page.
 * Filters out suspended events and events that have already ended based on the current date.
 * Results are ordered by start time ascending.
 * 
 * @async
 * @function getEventsForHome
 * @returns {Promise<Array<Object>>} An array of event objects including category and organisation names.
 */
async function getEventsForHome() {
    const now = new Date();
    const rows = await query(`
        SELECT e.*, c.name AS category_name, o.name AS org_name 
        FROM events e 
        JOIN categories c ON c.id = e.category_id 
        JOIN organisations o ON o.id = e.org_id 
        WHERE e.status='active' 
        ORDER BY e.start_time ASC
    `);
    // Filter out events that have already ended (end_time < current time)
    return rows.filter(r => new Date(r.end_time) >= now);
}

/**
 * Retrieves all event categories.
 * Used to populate the search filter dropdown on the Search page.
 * 
 * @async
 * @function getCategories
 * @returns {Promise<Array<Object>>} An array of category objects containing id, slug, and name.
 */
async function getCategories() {
    return query(`SELECT id, slug, name FROM categories ORDER BY name`);
}

/**
 * Searches for events based on specific criteria (date, location, category).
 * Dynamically builds the WHERE clause based on provided parameters.
 * Uses parameterized queries to ensure security against SQL injection.
 * 
 * @async
 * @function searchEvents
 * @param {Object} criteria - The search criteria object.
 * @param {string} [criteria.date] - Filters events starting on this specific date (YYYY-MM-DD).
 * @param {string} [criteria.location] - Filters events where city or venue contains this string (partial match).
 * @param {string} [criteria.category] - Filters events by the category slug.
 * @returns {Promise<Array<Object>>} An array of event objects matching the criteria.
 */
async function searchEvents({ date, location, category }) {
    let where = "e.status='active'";
    const params = [];

    if (date) { 
        where += " AND DATE(e.start_time)=?"; 
        params.push(date); 
    }
    if (location) { 
        where += " AND e.city LIKE ?"; 
        params.push(`%${location}%`); 
    }
    if (category) { 
        where += " AND c.slug=?"; 
        params.push(category); 
    }

    return query(`
        SELECT e.*, c.name AS category_name, o.name AS org_name 
        FROM events e 
        JOIN categories c ON c.id=e.category_id 
        JOIN organisations o ON o.id=e.org_id 
        WHERE ${where} 
        ORDER BY e.start_time ASC
    `, params);
}

/**
 * Retrieves detailed information for a specific event by its ID.
 * Includes associated ticket information for the Event Details page.
 * Returns null if the event is not found or is suspended.
 * 
 * @async
 * @function getEventById
 * @param {number} id - The unique identifier of the event.
 * @returns {Promise<Object|null>} An object containing event details and a tickets array, or null if not found.
 */
async function getEventById(id) {
    const [ev] = await query(`
        SELECT e.*, c.name AS category_name, o.name AS org_name 
        FROM events e 
        JOIN categories c ON c.id=e.category_id 
        JOIN organisations o ON o.id=e.org_id 
        WHERE e.id=? AND e.status<>'suspended' 
        LIMIT 1
    `, [id]);

    if (!ev) return null;

    // Fetch associated tickets for this event
    const tickets = await query(`SELECT * FROM tickets WHERE event_id=?`, [id]);
    
    // Merge tickets into the event object before returning
    return { ...ev, tickets };
}

module.exports = {
    testConnection,
    getEventsForHome,
    getCategories,
    searchEvents,
    getEventById
};