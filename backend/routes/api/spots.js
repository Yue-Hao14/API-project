const express = require('express');
const { Spot, SpotImage, Review, User, Booking } = require('../../db/models');
const spot = require('../../db/models/spot');
const { setTokenCookie, restoreUser } = require('../../utils/auth');
const router = express.Router();

// ------------------------------------------------------
// Get all Bookings for a Spot based on the Spot's id
router.get('/:spotId/bookings', restoreUser, async (req, res, _next) => {
  // extract user object (promise) from restoreUser middleware output
  const { user } = req;

  // convert user to normal POJO
  const userPOJO = user.toJSON();
  // console.log(userPOJO)

  // get userId of the current user
  const userId = userPOJO.id
  // console.log(userId);

  // find spots by spotId
  const spotId = req.params.spotId;

  // Check if current user is the owner of the spotId
  const spot = await Spot.findByPk(spotId);
  console.log(spot)

  // if no spot found, then error message
  // if current user is not the owner of the spot
  // if current user is the owenr of the spot
  if (!spot) {
    return res.status(404).json({
      message: "Spot couldn't be found",
      statusCode: 404
    })
  } else if (spot.ownerId === userId) {
    const Bookings = await Booking.findAll({
      where: {
        id: spotId
      },
      include: {
        model: User,
        attributes: {
          exclude: ['username','email','hashedPassword','createdAt', 'updatedAt']
        }
      }
    });
    return res.json({ Bookings });
  }else {
    const Bookings = await Booking.findAll({
      where: {
        id: spotId
      },
      attributes: {
        exclude: ['id','userId', 'createdAt', 'updatedAt']
      }
    });
    return res.json({ Bookings });
  }



})




// ------------------------------------------------------
// Get details of a spot by id
router.get('/:spotId', async (req, res, _next) => {

  // find spots by spotId
  const spotId = req.params.spotId;

  const spot = await Spot.findByPk(spotId, {
    include: [{
      model: SpotImage,
      attributes: {
        exclude: ['spotId', 'createdAt', 'updatedAt']
      }
    }, {
      model: User,
      as: 'Owner',
      attributes: {
        exclude: ['email', 'hashedPassword', 'username', 'createdAt', 'updatedAt']
      }
    }, Review]
  })

  // if no spot found in db
  // console.log(spot)
  if (!spot) {
    return res.status(404).json({
      message: "Spot couldn't be found",
      statusCode: 404
    })
  }

  const spotPOJO = spot.toJSON();
  // console.log(spotPOJO)

  // iterate through Reviews array to get numReviews and avgStarRating
  const reviewsArr = spotPOJO.Reviews;
  // console.log(reviewsArr)

  let numReviews = 0;
  let totalRating = 0;
  reviewsArr.forEach(review => {
    numReviews++;
    totalRating += review.stars
  });
  const avgStarRating = totalRating / numReviews;
  spotPOJO.numReviews = numReviews;
  spotPOJO.avgStarRating = avgStarRating;

  delete spotPOJO.Reviews;

  return res.json(spotPOJO);
})



// ------------------------------------------------------
// Get spots of current user
router.get('/current', restoreUser, async (req, res, _next) => {
  let result = {};

  // extract user object (promise) from restoreUser middleware output
  const { user } = req;

  // convert user to normal POJO
  const userPOJO = user.toJSON();
  // console.log(userPOJO)

  // get userId of the current user
  const userId = userPOJO.id
  // console.log(userId);

  const spots = await Spot.findAll({
    include: [Review, SpotImage],
    where: {
      ownerId: userId
    }
  })

  // initiate spotsArr to host formatted spots
  let spotsArr = [];

  // iterate through each spot object
  spots.forEach(spot => {
    let totalRating = 0;
    let totalCount = 0;

    // convert each spot to a normal POJO
    spot = spot.toJSON();

    // iterate through Review to calculate avgRating
    spot.Reviews.forEach(review => {
      totalCount++;
      totalRating += review.stars
    });
    let avgRating = totalRating / totalCount;
    spot.avgRating = avgRating;

    // iterate through SpotImages to set url to previewImage
    spot.SpotImages.forEach(spotImage => {
      if (spotImage.preview === true) {
        let previewImage = spotImage.url
        spot.previewImage = previewImage
      }
    })

    // remove Review and SpotImage objects
    delete spot.Reviews;
    delete spot.SpotImages;

    // push each formatted spot to spotsArr
    spotsArr.push(spot);
  });

  result.Spots = spotsArr;

  return res.json(result)

})


// ------------------------------------------------------
// Get all spots
router.get('/', async (req, res, _next) => {
  let result = {};

  const spots = await Spot.findAll({
    include: [Review, SpotImage]
  });

  // initiate spotsArr to host formatted spots
  let spotsArr = [];

  // iterate through each spot object
  spots.forEach(spot => {
    let totalRating = 0;
    let totalCount = 0;

    // convert each spot to a normal POJO
    spot = spot.toJSON();

    // iterate through Review to calculate avgRating
    spot.Reviews.forEach(review => {
      totalCount++;
      totalRating += review.stars
    });
    let avgRating = totalRating / totalCount;
    spot.avgRating = avgRating;

    // iterate through SpotImages to set url to previewImage
    spot.SpotImages.forEach(spotImage => {
      if (spotImage.preview === true) {
        let previewImage = spotImage.url
        spot.previewImage = previewImage
      }
    })

    // remove Review and SpotImage objects
    delete spot.Reviews;
    delete spot.SpotImages;

    // push each formatted spot to spotsArr
    spotsArr.push(spot);
  });

  result.Spots = spotsArr;

  return res.json(result)
});


// ------------------------------------------------------
// Add an Image to a Spot based on the Spot's id
router.post('/:spotid/images', restoreUser, async (req, res, _next) => {
  // extract logged in/current user object (promise) from restoreUser middleware output
  const { user } = req;

  // convert user object to normal POJO
  const userPOJO = user.toJSON();
  // console.log(userPOJO)

  // get userId of the current user
  const userId = userPOJO.id
  // console.log(userId);

  // extract spotId
  const spotId = req.params.spotid;

  // find all the spots owned by the current user
  const ownedSpots = await Spot.findAll({
    where: {
      ownerId: userId,
      id: spotId
    }
  })

  // if not spots found, then error message
  if (ownedSpots.length === 0) {
    return res.status(404).json({
      message: "Spot couldn't be found",
      statusCode: 404
    })
  }

  // extract url and preview from res.body
  const { url, preview } = req.body;

  // add image to SpotImages table
  const image = await SpotImage.create({
    spotId,
    url,
    preview
  })

  const newImage = await SpotImage.findOne({
    where: {
      url: url
    },
    attributes: {
      exclude: ['spotId']
    }
  })

  return res.json(newImage)
})


// ------------------------------------------------------
// Create a Booking for a Spot based on the Spot's id
router.post('/:spotId/bookings', restoreUser, async (req, res, _next) => {
  // get spotId
  const spotId = req.params.spotId;

  // extract user object (promise) from restoreUser middleware output
  const { user } = req;

  // convert user to normal POJO
  const userPOJO = user.toJSON();
  // console.log(userPOJO)

  // get userId of the current user
  const userId = userPOJO.id
  // console.log(userId);

  // data manipulation on startDate and endDate from req.body
  let { startDate, endDate } = req.body;
  startDate = new Date(startDate);
  endDate = new Date(endDate);

  const startDateFormatted = startDate.toDateString();
  const endDateFormatted = endDate.toDateString();
  // console.log(startDate)

  // if endDate earlier than startDate, error message
  if (endDate.getTime() <= startDate.getTime()) {
    return res.status(400).json({
      message: "Validation error",
      statusCode: 400,
      errors: [
        "endDate cannot be on or before startDate"
      ]
    })
  }

  // find spot based on spotId
  const spot = await Spot.findByPk(spotId);

  // if no spot is found, then error message
  if (!spot) {
    return res.status(404).json({
      message: "Spot couldn't be found",
      statusCode: 404
    })
  }

  // if current user is the owner of the spot, then error message
  if(spot.ownerId === userId) {
    return res.status(404).json({
      message: "Owner cannot create booking for your own property",
      statusCode: 404
    })
  }

  // check if booking is conflict with existing bookings
  // get all the booking of current spot
  const spotBookingsArr = await Booking.findAll({
    where: {
      spotId: spotId
    }
  })
  // console.log(spotBookingsArr)

  // extract the month and year of new booking
  const currentMonth = startDate.getMonth()
  // console.log(currentMonth)
  const currentYear = startDate.getFullYear();


  // filter for bookings that has the same month and next month and year of this new booking
  let currentMonthBooking = [];
  let nextMonthBooking = [];
  spotBookingsArr.forEach( existingBooking => {
    existingBooking = existingBooking.toJSON();

    let bookingStartDate = existingBooking.startDate
    bookingStartDate = new Date (bookingStartDate)
    let bookingEndDate = existingBooking.endDate
    bookingEndDate = new Date (bookingEndDate)
    let bookingMonth = bookingStartDate.getMonth();
    let bookingYear = bookingStartDate.getFullYear();

    // push same month booking to array
    if (bookingMonth === currentMonth && bookingYear === currentYear) {
      currentMonthBooking.push({
        startDate: bookingStartDate,
        endDate: bookingEndDate
      })
    }

    // push same month booking to array
    if (bookingMonth === (currentMonth + 1) && bookingYear === currentYear) {
      nextMonthBooking.push({
        startDate: bookingStartDate,
        endDate: bookingEndDate
      })
    }
  });

  // console.log(currentMonthBooking)
  // console.log(nextMonthBooking)


  // compare existing same month booking with this new one
    // 1. if new startDate before earliest existing startDate, check if new endDate
    // is before earlist existing startDate
    // 2. if new startDate behind latest existing endDate, check if new endDate
    // is before next month's earliest existing startDate
    // 3. if new startDate is in between ealiest existing startDate and latest existing endDate,
    // iterate through existing same month's bookings
      // if new startDate earlier than existing startDate but new endDate later than existing startDate, error
      // if new startDate later than existing startDate but earlier than existing endDate, error
      // move on to check next booking
      // once all same month's booking has checked against new booking
      // go on to successful booking response

  // edge case: if new booking across 2 years, then take existing Dec and Jan of next yr's bookings to compare





  // create booking
  const booking = await Booking.create({
    spotId,
    userId,
    startDate,
    endDate
  })

  const bookingFromDB = await Booking.findOne({
    where: {
      spotId: spotId,
    userId: userId,
    startDate: startDate,
    endDate: endDate
    }
  })



  return res.json(bookingFromDB)
})


// ------------------------------------------------------
// Create a spot
router.post('/', restoreUser, async (req, res, _next) => {
  // extract user object (promise) from restoreUser middleware output
  const { user } = req;

  // convert user to normal POJO
  const userPOJO = user.toJSON();
  // console.log(userPOJO)

  // get userId of the current user
  const userId = userPOJO.id
  // console.log(userId);

  const { address, city, state, country, lat, lng, name, description, price } = req.body

  // error messages
  const error = {
    messages: "Validation Error",
    statusCode: 400
  }

  const errors = [];
  if (!address) {
    errors.push("Street address is required");
  };
  if (!city) {
    errors.push("City is required");
  };
  if (!state) {
    errors.push("State is required");
  };
  if (!country) {
    errors.push("Country is required");
  };
  if (!lat) {
    errors.push("Latitude is required");
  };
  if (!lng) {
    errors.push("Longitude is required");
  };
  if (!name || name.length > 50) {
    errors.push("Name must be less than 50 characters");
  };
  if (!description) {
    errors.push("Description is required");
  };
  if (!price) {
    errors.push("Price per day is required");
  };

  error.errors = errors
  if (errors.length > 0) {
    return res.status(400).json(error);
  }

  const spot = await Spot.create({
    ownerId: userId,
    address,
    city,
    state,
    country,
    lat,
    lng,
    name,
    description,
    price
  })

  const newSpot = await Spot.findOne({
    where: {
      name: name
    }
  })

  return res.json(newSpot)
})


module.exports = router;
