let db = {
    users: [
        {
            userID: 'dVmuxCANkSMzCz8XLDjGe5FpiaI3',
            email: 'user@email.com',
            handle: 'user',
            createdAt: '2020-01-23T02:24:12.422Z',
            imageUrl: 'image/gg/no/re',
            bio: 'Hello this is 1604!!!!!!!!!!!!!',
            website: '16oh4.com',
            location: 'andromeda'
        }
    ],
    
    //this is a 1-to-squillions relationship
    //called PARENT REFERENCING    
    screams: [
        {
            userHandle: 'user', //denormalized into screams from users table
            body: 'this is the scream body',
            createdAt: '2020-01-23T02:24:12.422Z',
            likeCount: 5,
            commentCount: 2,
        },
    ],
    comments: [
        {
            userHandle: 'user', //denormalized into comments from users table
            screamId: '2j03jd92ndwhd8s92js0', //denormalized into comments from screams table (1 to squillions)
            body: 'nice!',
            createdAt: '2020-01-23T02:24:12.422Z'
        }        
    ],
    notifications: [
        {
            recipient: 'user',
            sender: 'john',
            read: 'true | false',
            screamId: '299djh2skd912d2d',
            type: 'like | comment',
            createdAt: '2020-01-23T02:24:12.422Z',
        }
    ]
};

const userDetails = {
    //REDUX DATA
    credentials: {
        userId: 'H9HDJEJU8H8DNB90BD7HZAC27H3',
        email: 'user@email.com',
        handle: 'user',
        createdAt: '2020-01-23T02:24:12.422Z',
        imageUrl: 'image/gg/no/re',
        bio: `Let's go Viscous!`,
        website: 'https://user.com',
        location: 'MTY'
    },
    likes: [
        {
            userHandle: 'user', //denormalized into likes collection from user document
            screamId: '2j03jd92ndwhd8s92js0', //denormalized into likes collection from screams
        },
        {
            userHandle: 'user',
            screamId: 'dji29dj2ens920ajcnd8'
        }
    ]
}