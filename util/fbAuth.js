const { admin, db } = require('./admin')
const {errStr, sucStr} = require('./validators')

//middleware as arbitrator for the /createScream route to check if the route should proceed
//checks if user is logged in before proceeding with the route

//module.exports is assigned to because it is the only thing exported in this file
//req is added DecodedIdToken at req.user and it also contains req.user.handle
module.exports = (req, res, next) => {
    let idToken;

    //check if request has authorization and is formatted correctly
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        //get the idtoken from the request
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        // console.error(logErrorString(req, err, "Authorization header error"));
        return res.status(403).json( {error: 'Unauthorized'} );
    }
    //console.log(`req headers: ${JSON.stringify(req.headers.authorization)}\n\n`)
    //console.log(`id token: ${idToken}\n\n`)
    //By this point, the authentication token is within the header, so let's verify it
    admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
        req.user = decodedToken; //add user data to the original request embedded in req object
        //console.log(decodedToken);
        
        return db.collection('users')   //returns a CollectionReference
        .where('userId', '==', req.user.uid) //returns a Query<DocumentData> by searching for uid from DecodedIdToken
        .limit(1) //returns a Query<DocumentData>
        .get(); //returns a Promise<QuerySnapshot<DocumentData>>
    })
    .then(querySnapshot => {
        //gets the first element in the array of documents and gets the data as an OBJ, then the handle property
        //QuerySnapshot.QueryDocumentSnapshot.DocumentSnapshot.DocumentData.handle "field"
        req.user.handle = querySnapshot.docs[0].data().handle; //store the handle in the req.user (DecodedIdToken) object
        req.user.imageUrl = querySnapshot.docs[0].data().imageUrl;
        return next();
    })
    .catch( err => {
        console.error(err);
        return res.status(403).json({error: err.code});
    })
};