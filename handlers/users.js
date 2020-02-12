const { admin, db, FieldValue } = require('../util/admin');
const { validateSignupData, validateLoginData, reduceUserDetails, errStr, sucStr } = require('../util/validators');

const firebaseConfig = require('../config')
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

// Sign users up
//exports."" used here instead of module.exports because multiple exports
exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,    //the "username"
    };
    
    //destructuring
    const { valid, errors } = validateSignupData(newUser);
    //if the function returns not valid, then return error 400 (bad client request)
    if(!valid) return res.status(400).json(errors);

    //USER IS VALIDATED FROM THIS POINT ON
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if(doc.exists) {
            exists = true;
            return res.status(400).json({handle: 'this handle is already taken'});
        }
        else {
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
        }
    })   
    .then( data => { //UserCredential promise
        userId = data.user.uid;
        return data.user.getIdToken(); //returns JSON web Token to identify user to firebase service
    })
    .then(idToken => { //token promise
        token = idToken;
        const defaultImg = 'default_user.png';
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${defaultImg}?alt=media`;

        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            imageUrl,
            userId,  //does not need value if key=value
        };

        //create our own storage document for the account created by firebause.auth().createUserWithEmailAndPassword
        return db.doc(`users/${newUser.handle}`).set(userCredentials);
    })
    .then( (writeResult) => { //write result promise
        return res.status(201).json({ token });
    })
    .catch( err => {
        console.error(errStr(req, err, 'Could not set update user credentials on Firestore'));
        if(err.code === 'auth/email-already-in-use') {  //if client error return status 400
            return res.status(400).json( { email: 'Email is already registered'} );
        }
        return res.status(500).json( { general: 'Something went wrong, please try again', error: err.code} ); //otherwise it must be a server error
    });

};

//Log user in 
exports.login = (req, res) => {

    const user = {
        email: req.body.email,      //request is from the JSON object sent from the form
        password: req.body.password,
    };

    //destructuring
    const { valid, errors } = validateLoginData(user);
    //if the function returns not valid, then return error 400 (bad client request)
    if(!valid) return res.status(400).json(errors);
    

    //SIGNIN
    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then( userCred => {
        return userCred.user.getIdToken();
    })
    .then( token => {
        return res.status(200).json({token});
    })
    .catch( err => {
        console.error(errStr(req, err, 'Could not sign-in'));
        // auth/wrong-password
        // auth/user-not-user
        return res.status(403).json( {general: "Wrong credentials, please try again"});
        // return res.status(500).json({error: err.code});
    })
};

//Add user details
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body); //check for empty strings inside the user entered fields from front-end
    userDetails.timestamp = FieldValue.serverTimestamp(); //add a timestamp to the updated record

    console.log(`User details!!!: ${JSON.stringify(userDetails)}`);
    //update document in the database with the fields in the parameter object 'userDetails'
    //protected route, so the FBAuth middleware gives access to req.user.handle
    db.doc(`users/${req.user.handle}`).update(userDetails)
    .then( () => { //returns a WriteResult promise so we don't need it
        console.log(sucStr(req, "Details added successfully"));
        return res.json( {message: 'Details added successfully'} );
    })
    .catch( err => {
        console.error(errStr(req, err, "Could not update document on Firestore"));
        return res.status(500).json( {error: err.code} );
    })
}

// Fetch any user's details
exports.getUserDetails = (req, res) => {
    let userData = {};
    db.doc(`users/${req.params.handle}`).get()
    .then( userSnapshot => { //First store metadata about user
        if(userSnapshot.exists) {
            userData.user = userSnapshot.data();
            return db.collection(`screams`).where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc')
            .limit(10).get();
        }
        else {
            return res.status(404).json( {error: `There does not exist a user named: ${req.params.handle}`});
        }
    })
    .then(screamQuerySnapshot => {
        userData.screams = [];
        screamQuerySnapshot.forEach(screamSnapshot => {
            userData.screams.push({
                ...screamSnapshot.data(),
                screamId: screamSnapshot.id
            });
        });
        return res.json(userData);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json( {error: err.code} );
    })
}

// Get own user details
exports.getAuthenticatedUser = (req, res) => {
    let userData = {}; //for sending back response
    //get user document first
    db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
        if(doc.exists) {
            userData.credentials = doc.data();
            return db.collection('likes').where('userHandle', '==', req.user.handle).get();
        }
    })
    //the querySnapshot is a collection of documents that matched the query
    .then(querySnapshot => {    //this promise returns the QuerySnapshot as dictated by db.collection.where.get
        userData.likes = [];
        querySnapshot.forEach( docSnapshot => { //iterate over the QuerySnapshot to get each document that matched query
            userData.likes.push(docSnapshot.data()); //push the likes documents into the userData.likes array
        });
        console.log(sucStr(req, 'Successfully queried database for user likes'));
        // userData.timestamp = FieldValue.serverTimestamp(); //append timestamp for future debugging
        // return res.json(userData);

        // RETURN LIST OF NOTIFS
        return db.collection('notifications').where('recipient', '==', req.user.handle).orderBy('createdAt','desc').limit(10).get();
    })
    .then(querySnapshot => {
        userData.notifications = [];
        querySnapshot.forEach(notif => {
            userData.notifications.push({
                ...notif.data(),
                notificationId: notif.id
            })
        });
        return res.json(userData);
    })
    .catch( err => {
        console.error(errStr(req, err, 'Could not query database for user'));
        return res.status(500).json(err);
    })
}

// Upload a profile image for user
//req will contain user object inside req.user because of FBAuth middleware
exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    //console.log(JSON.stringify(req.headers));
    //delete req.headers['content-type'];
    const busboy = new BusBoy( {headers: req.headers} );

    let imgFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldName, file, fileName, encoding, mimeType) => {
        //console.log(JSON.stringify( {fieldName, file, fileName, mimeType} ));

        //check if image is jpeg and png
        if(mimeType!=='image/jpeg' && mimeType!=='image/png' && mimeType!=='image/gif') {
            console.log({user: req.user.handle, error: 'Invalid mime type (file extension)'});
            return res.status(400).json({error: 'Invalid mime type (file extension)'});
        }

        // if image.png need to get extension... what about my.image.png??
        const imgSplit = fileName.split('.');
        const imgExt = imgSplit[imgSplit.length-1];
        imgFileName = `${Math.round(Math.random()*Math.pow(10,7))}.${imgExt}` ;
        const filePath = path.join(os.tmpdir(), imgFileName);

        imageToBeUploaded = { filePath, mimeType };
        file.pipe(fs.createWriteStream(filePath)); //use filesystem library to create file using a WriteStream
    });

    busboy.on('finish', () => {
        const uploadOptions = {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimeType
                }
            }
        };

        admin.storage().bucket(firebaseConfig.storageBucket).upload(imageToBeUploaded.filePath, uploadOptions)
        .then( () => {
            //construct img url to add it to the user
            //alt=media tells browser to display it instead of downloading it
            //? is a URL parameter
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imgFileName}?alt=media`;

            return db.doc(`users/${req.user.handle}`).update({imageUrl})
        })
        .then( () => {
            //201 is resource created
            return res.status(201).json( {message: 'Image uploaded sucessfully!'});
        })
        .catch( err => {
            //err is an object that contains err and message properties
            console.error(errStr(req, err, 'Could not update imageUrl'));
            return res.status(500).json(err);
        })
    });

    //ALWAYS CALL THIS AT THE END OF BUSBOY WITH SAME req.rawBody
    //this property is in every request object
    busboy.end(req.rawBody);
}

exports.markNotificationsRead = (req, res) => {
    //Will send to server array of notif ID's to mark read
    //BATCH WRITE in Firebase
    let batch = db.batch(); //single atomic operation

    /*
    if(typeof req.body.length) { //if it's only one notification
        db.doc(`notifications/${req.body}`).update({read: true})
        .then( () => {
            res.status(200).json( {message: 'Notification marked read'} );
        })
        .catch( err => {
            res.status(500).json( {error: err.code} );
        })
    }
    */

    req.body.forEach(notificationId => {
        const notifDocRef = db.doc(`/notifications/${notificationId}`); //get DocumentReference to update fields in
        batch.update(notifDocRef, { read: true} ); //adds to a list of updates to commit later
    });
    batch.commit() //aggregates all updates and commits atomically
    .then( () => {
        return res.status(200).json( {message: 'Notifications marked read'} );
    })
    .catch( err => {
        console.error(err);
        return res.status(500).json( {error: err.code});
    })
    
}