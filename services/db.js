const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017/grasscutter';
let client = null;
let db = null;
let connecting = false;

async function connect() {
  if (db) return db;
  if (connecting) return null;
  connecting = true;
  try {
    client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
    await client.connect();
    db = client.db('grasscutter');
    console.log('[DB] MongoDB 已连接');
    connecting = false;
    return db;
  } catch (err) {
    connecting = false;
    db = null;
    client = null;
    throw err;
  }
}

function getDb() {
  return db;
}

function isConnected() {
  return db !== null;
}

async function disconnect() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[DB] MongoDB 已断开');
  }
}

module.exports = { connect, getDb, disconnect, isConnected };
