//HELPER FUNCTIONS
const isEmpty = (string) => {
    if(!isUndefined(string) && string.trim() === '') return true;
    else return false;
}

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if( email.match(regEx) ) return true;
    else return false;
}

const isUndefined = (value) => {
    return (typeof value === 'undefined');
}

exports.validateScream = (data) => {
    let errors = {};
    if(isEmpty(data)) errors.body = 'Must not be empty';
    
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}
exports.validateSignupData = (data) => {
    let errors = {};

    //Check email
    if(isEmpty(data.email)) errors.email = 'Must not be empty';
    else if(!isEmail(data.email)) errors.email = 'Must be a valid email address';
    //Check password
    if(isEmpty(data.password)) errors.password = 'Must not be empty';
    if(data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords must match';
    //Check handle
    if(isEmpty(data.handle)) errors.handle = 'Must not be empty';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
};

exports.validateLoginData = (data) => {
    let errors = {};

    if(isEmpty(data.email)) errors.email = 'Must not be empty';
    if(isEmpty(data.password)) errors.password = 'Must not be empty';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

//data is req.body
//This function makes sure we don't send empty strings to the database by checking each field from the frontend
exports.reduceUserDetails = (data) => {
    let userDetails = { };

    if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
    if(!isEmpty(data.website.trim())) {        
        if(!data.website.trim().startsWith('https://') && !data.website.trim().startsWith('http://')) 
            userDetails.website = `http://${data.website.trim()}`;
        else userDetails.website = data.website.trim();
    }
    if(!isEmpty(data.location.trim())) userDetails.location = data.location;

    return userDetails;

}

exports.errStr = (req, err, msg) => {
    let ret = {
        backend: msg, 
        reqBody: req.body, 
        reqHeaders: req.headers,
        code: err.code,
        msg: err.msg
    };

    // if(req.user !== 'undefined') ret.reqUser = req.user.handle;
    // if(req.route !== 'undefined') ret.reqRoute = req.route;
    return ret;
}

exports.sucStr = (req, msg) => {
    let ret = {
        backend: msg, 
        reqBody: req.body, 
        reqHeaders: req.headers
    };

    // if(req.user.handle !== 'undefined') ret.reqUser = req.user.handle;
    return ret;
}