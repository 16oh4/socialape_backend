const cloudAccount = require('../cloud.json');
const admin = require('firebase-admin');
const FieldValue = admin.firestore.FieldValue;
admin.initializeApp({
    credential: admin.credential.cert(cloudAccount)
});
const db = admin.firestore();

module.exports = {admin, db, FieldValue};