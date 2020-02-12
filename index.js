//require('dotenv').config();
//LIBRARY IMPORTS
const functions = require('firebase-functions');
const cors = require('cors');
const app = require('express')();
const { db } = require('./util/admin');

app.use(cors());

//INTERNAL IMPORTS
const FBAuth = require('./util/fbAuth');
const { 
    getAllScreams, 
    postOneScream,
    postOneComment,
    getScream,
    deleteScream,
    likeScream,
    unlikeScream,
} = require('./handlers/screams');
const { 
    //POST
    signup, 
    login, 
    uploadImage, 
    addUserDetails,
    markNotificationsRead,

    //GET
    getUserDetails,
    getAuthenticatedUser,

} = require('./handlers/users');

//SCREAM ROUTES
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream); //FBAuth authenticates, //ROUTE, HANDLER
app.get('/scream/:screamId', getScream); //the colon is a route parameter that is like a variable from a URL
app.delete('/scream/:screamId', FBAuth, deleteScream);
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);

//COMMMENT ROUTE
app.post('/scream/:screamId/comment', FBAuth, postOneComment)

//USER ROUTES
//The user will not see these links, they are routes to access backend
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage); //this is a protected route, so make sure user is logged in with FBAuth
app.post('/user', FBAuth, addUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

app.get('/user/:handle', getUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

// https://baseurl.com/api/ this is good practice
//this will send all the routes in "app" to firebase!

//the parameter "app" passed in will automatically turn into multiple routes
exports.api = functions.https.onRequest(app); //ON REQUEST

// NOTIFICATIONS 

//This is a database trigger, not an endpoint. Therefore, no responses are sent.
exports.createNotificationOnLike = functions.region('us-central1').firestore.document('likes/{id}')
.onCreate(likeSnapshot => { //fetch the data of the like

    return db.doc(`/screams/${likeSnapshot.data().screamId}`).get()
    .then(screamSnapshot => { //need to fetch the userHandle of the scream owner to send the notification

        console.log('We not gucci!');
        if(screamSnapshot.exists && (likeSnapshot.data().userHandle !== screamSnapshot.data().userHandle)) {
            console.log(JSON.stringify({
                likeHandle: likeSnapshot.data().userHandle,
                screamHandle: screamSnapshot.data().userHandle
            }));
            return db.doc(`/notifications/${likeSnapshot.id}`).set({ //set is used to create notifs for same scream
                createdAt: new Date().toISOString(),
                recipient: screamSnapshot.data().userHandle,
                sender: likeSnapshot.data().userHandle,
                screamId: screamSnapshot.id, //or likeSnapshot.data().screamId
                type: 'like',
                read: false
            });
        }
    })
    // .then( () => { //write result from db.doc.set()
    //     console.log(`Created notification for: ${screamSnapshot.id}`);
    //     return;
    // })
    .catch( err => {
        console.error(err);
    });
});

exports.deleteNotificationOnUnlike = functions.region('us-central1').firestore.document('likes/{id}')
.onDelete(likeSnapshot => {
    return db.doc(`/notifications/${likeSnapshot.id}`).delete() //search for the
    .catch( err => {
        console.error(err);
    })
});

exports.createNotificationOnComment = functions.region('us-central1').firestore.document('comments/{id}')
.onCreate(commentSnapshot => {
    return db.doc(`/screams/${commentSnapshot.data().screamId}`).get() //fetch the scream the comment lives in
    .then(screamSnapshot => { //need to get the scream data to send the update to the scream userHandle
        if(screamSnapshot.exists && (commentSnapshot.data().userHandle !== screamSnapshot.data().userHandle)) { //onCreate was called because it exists, but it's good practice to check if exists
            return db.doc(`/notifications/${commentSnapshot.id}`).set({ //set is used to create notifs for same scream
                createdAt: new Date().toISOString(),
                recipient: screamSnapshot.data().userHandle,
                sender: commentSnapshot.data().userHandle,
                screamId: screamSnapshot.id,
                type: 'comment',
                read: false
            });
        }
    })
    // .then( () => { //write result from db.doc.set()
    //     console.log(`Created notification: ${commentSnapshot.id}`);
    //     return;
    // })
    .catch( err => {
        console.error(err);
    });
});

//TODO: FIX THIS FUNCTION ITS BROKEN
exports.onImageChange = functions.region('us-central1').firestore.document('users/{userId}')
.onUpdate( (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const handle = after.handle;
    const batch = db.batch();

    if(after.imageUrl !== before.imageUrl) {
        //Must change all comments and screams
        db.collection('comments').where('userHandle', '==', handle).get()
        .then(commentsQS => {
            commentsQS.forEach(commentDS => {
                batch.update(commentDS.ref, {userImage: after.imageUrl});
            })
            return db.collection('screams').where('userHandle', '==', handle).get()
        })
        .then(screamsQS => {
            screamsQS.forEach(screamDS => {
                batch.update(screamDS.ref, {userImage: after.imageUrl});
            })
            return batch.commit();
        })
        .catch(err => {
            console.error(err);
        })
    }
    else return true;
});

//TODO : FIX THIS FUNCTION ITS BROKEN
//Delete all notifications, comments, and likes for a scream that gets deleted
exports.onScreamDelete = functions.region('us-central1').firestore.document(`screams/{screamId}`)
.onDelete((screamSnapshot, screamContext) => {
    const screamId = screamContext.params.screamId;
    const batch = db.batch();

    //DELETE COMMENTS
    return db.collection('comments').where('screamId', '==', screamId).get()
    .then(commentsQuerySnapshot => {
        commentsQuerySnapshot.forEach(commentSnapshot => {
            batch.delete(commentSnapshot.ref);
        });
        return db.collection('likes').where('screamId','==', screamId).get();        
    })
    //DELETE LIKES
    .then(likesQuerySnapshot => {
        likesQuerySnapshot.forEach(likeSnapshot => {
            batch.delete(likeSnapshot.ref);
        });
        return db.collection('notifications').where('screamId', '==', screamId).get();
    })
    //DELETE NOTIFS
    .then(notifQuerySnapshot => {
        notifQuerySnapshot.forEach(notifSnapshot => {
            batch.delete(notifSnapshot.ref);
        });
        return batch.commit();
    })
    .catch(err => {
        console.error(err);
    })
})