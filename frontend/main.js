const cafeResults = document.querySelector("#cafe-results");
const cafeStatus = document.querySelector("#cafe-status");
const cafeCountNumber = document.querySelector("#cafe-count-number");
const useLocationBtn = document.querySelector("#locate-button");
const cafeSearchInput = document.querySelector("#cafe-search");
const ratingFilter = document.querySelector("#rating-filter");

let cafes = [];
let userLocation = null;

const setupMobileNav = () => {
  const burger = document.querySelector(".burger");
  const nav = document.querySelector(".nav-links");
  const navLinks = document.querySelectorAll(".nav-links li");

  if (!burger || !nav) return;

  burger.addEventListener("click", () => {
    nav.classList.toggle("nav-active");
    burger.classList.toggle("toggle");

    navLinks.forEach((link, index) => {
      link.style.animation = link.style.animation
        ? ""
        : `navLinkFade 0.5s ease forwards ${index / 5 + 0.5}s`;
    });
  });
};

const setupActiveNav = () => {
  const navLinks = document.querySelectorAll(".nav-item");
  const currentPage = window.location.pathname.split("/").pop();

  navLinks.forEach((navLink) => {
    const linkPage = navLink.getAttribute("href")?.split("/").pop();

    if (linkPage === currentPage) {
      navLink.classList.add("active");
    }
  });
};

const setupSwiper = () => {
  if (typeof Swiper === "undefined") return;

  const swiperElement = document.querySelector(".swiper");

  if (!swiperElement) return;

  new Swiper(".swiper", {
    loop: true,
    speed: 1000,
    autoplay: {
      delay: 4000,
      disableOnInteraction: false,
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });
};

const degreesToRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

const calculateDistanceKm = (
  userLatitude,
  userLongitude,
  cafeLatitude,
  cafeLongitude
) => {
  const earthRadiusKm = 6371;

  const latitudeDifference = degreesToRadians(
    cafeLatitude - userLatitude
  );

  const longitudeDifference = degreesToRadians(
    cafeLongitude - userLongitude
  );

  const userLatitudeRadians = degreesToRadians(userLatitude);
  const cafeLatitudeRadians = degreesToRadians(cafeLatitude);

  const haversineValue =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(userLatitudeRadians) *
      Math.cos(cafeLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2;

  const centralAngle =
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    );

  return earthRadiusKm * centralAngle;
};

const loadCafes = async () => {
  try {
    const response = await fetch("./data/cafes.json");

    if (!response.ok) {
      throw new Error(
        `Could not load café data. Status: ${response.status}`
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.cafes)) {
      throw new Error(
        "The café JSON does not match the V2 dataset structure."
      );
    }

    cafes = data.cafes.filter((cafe) => {
      return cafe.publishState !== "hold-for-verification";
    });

    updateCafeResults();
  } catch (error) {
    console.error(error);

    if (cafeStatus) {
      cafeStatus.textContent =
        "Sorry, café data could not be loaded. Check frontend/data/cafes.json.";
    }
  }
};

const getPrimaryRating = (cafe) => {
  if (!Array.isArray(cafe.ratings) || cafe.ratings.length === 0) {
    return null;
  }

  const preferredSources = [
    "Google",
    "Tripadvisor",
    "Restaurant Guru",
    "Facebook",
  ];

  for (const sourceName of preferredSources) {
    const rating = cafe.ratings.find(
      (item) => item.source === sourceName
    );

    if (rating) {
      return rating;
    }
  }

  return cafe.ratings[0];
};

const getFullAddress = (cafe) => {
  const address = cafe.address || {};

  return [
    address.street,
    address.suburb,
    address.city,
  ]
    .filter(Boolean)
    .join(", ");
};

const hasVerifiedCoordinates = (cafe) => {
  const location = cafe.location;

  return Boolean(
    location &&
      location.geoVerified === true &&
      typeof location.latitude === "number" &&
      typeof location.longitude === "number"
  );
};

const addDistancesAndSort = (cafesToProcess) => {
  if (!userLocation) {
    return [...cafesToProcess];
  }

  return cafesToProcess
    .map((cafe) => {
      if (!hasVerifiedCoordinates(cafe)) {
        return {
          ...cafe,
          distance: null,
        };
      }

      const distance = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        cafe.location.latitude,
        cafe.location.longitude
      );

      return {
        ...cafe,
        distance,
      };
    })
    .sort((firstCafe, secondCafe) => {
      const firstHasDistance =
        typeof firstCafe.distance === "number";

      const secondHasDistance =
        typeof secondCafe.distance === "number";

      if (firstHasDistance && secondHasDistance) {
        return firstCafe.distance - secondCafe.distance;
      }

      if (firstHasDistance) return -1;
      if (secondHasDistance) return 1;

      return firstCafe.name.localeCompare(secondCafe.name);
    });
};

const getFilteredCafes = () => {
  const searchTerm =
    cafeSearchInput?.value.toLowerCase().trim() || "";

  const minimumRating = Number(
    ratingFilter?.value || 0
  );

  const filteredCafes = cafes.filter((cafe) => {
    const primaryRating = getPrimaryRating(cafe);
    const ratingValue = primaryRating?.rating || 0;

    const searchableText = [
      cafe.name,
      cafe.description,
      cafe.venueType,
      cafe.area,
      cafe.address?.street,
      cafe.address?.suburb,
      cafe.address?.city,
      ...(cafe.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      searchableText.includes(searchTerm);

    const matchesRating =
      ratingValue >= minimumRating;

    return matchesSearch && matchesRating;
  });

  return addDistancesAndSort(filteredCafes);
};

const getCoffeePriceText = (cafe) => {
  const prices = cafe.coffeePrices;

  if (!prices) {
    return "Coffee price not verified";
  }

  if (typeof prices.flatWhite === "number") {
    return `Flat white from NZ$${prices.flatWhite.toFixed(2)}`;
  }

  if (
    prices.flatWhite &&
    typeof prices.flatWhite === "object"
  ) {
    const availablePrices = Object.values(
      prices.flatWhite
    ).filter((value) => typeof value === "number");

    if (availablePrices.length > 0) {
      const lowestPrice = Math.min(...availablePrices);

      return `Flat white from NZ$${lowestPrice.toFixed(2)}`;
    }
  }

  return "Coffee price not verified";
};

const getVerificationLabel = (cafe) => {
  if (cafe.publishState === "publishable") {
    return "Verified listing";
  }

  if (cafe.publishState === "publishable-with-caveat") {
    return "Some details need verification";
  }

  return "Verification pending";
};

const renderCafes = (cafesToRender) => {
  if (!cafeResults) return;

  cafeResults.innerHTML = "";

  if (cafeCountNumber) {
    cafeCountNumber.textContent = cafesToRender.length;
  }

  if (cafesToRender.length === 0) {
    cafeResults.innerHTML = `
      <article class="cafe-details">
        <h3>No cafés found</h3>
        <p>Try another search or lower the rating filter.</p>
      </article>
    `;

    return;
  }

  cafesToRender.forEach((cafe) => {
    const cafeCard = document.createElement("article");
    cafeCard.className = "cafe-details";

    const primaryRating = getPrimaryRating(cafe);
    const fullAddress = getFullAddress(cafe);
    const coffeePriceText = getCoffeePriceText(cafe);
    const verificationLabel = getVerificationLabel(cafe);

    const ratingText = primaryRating
      ? `
        <p class="cafe-rating">
          <strong>Rating:</strong>
          ${primaryRating.rating} stars
          ${
            primaryRating.reviewCount
              ? `(${primaryRating.reviewCount} reviews)`
              : ""
          }
          <span class="rating-source">
            via ${primaryRating.source}
          </span>
        </p>
      `
      : `
        <p class="cafe-rating">
          <strong>Rating:</strong> Not available
        </p>
      `;

    const distanceText =
      typeof cafe.distance === "number"
        ? `
          <p class="cafe-distance">
            <strong>Distance:</strong>
            ${cafe.distance.toFixed(1)} km away
          </p>
        `
        : userLocation
        ? `
          <p class="cafe-distance cafe-distance-unavailable">
            Distance unavailable until location is verified
          </p>
        `
        : "";

    const websiteText = cafe.contact?.website
      ? `
        <p>
          <a
            href="${cafe.contact.website}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit website
          </a>
        </p>
      `
      : "";

    const phoneText = cafe.contact?.phone
      ? `
        <p>
          <strong>Phone:</strong>
          <a href="tel:${cafe.contact.phone.replace(/\s/g, "")}">
            ${cafe.contact.phone}
          </a>
        </p>
      `
      : "";

    const hoursText = cafe.hours?.summary
      ? cafe.hours.summary
      : "Hours not verified";

    const tags = cafe.tags || [];

    cafeCard.innerHTML = `
      <div class="cafe-card-header">
        <h3>${cafe.name}</h3>
        <span class="verification-badge">
          ${verificationLabel}
        </span>
      </div>

      <p class="cafe-description">
        ${cafe.description || ""}
      </p>

      <p>
        <strong>Address:</strong>
        ${fullAddress || "Address not verified"}
      </p>

      <p>
        <strong>Hours:</strong>
        ${hoursText}
      </p>

      ${phoneText}
      ${ratingText}

      <p>
        <strong>Price:</strong>
        ${coffeePriceText}
      </p>

      ${distanceText}
      ${websiteText}

      <div class="cafe-tags">
        ${tags
          .map((tag) => `<span>${tag}</span>`)
          .join("")}
      </div>
    `;

    cafeResults.appendChild(cafeCard);
  });
};

const updateCafeResults = () => {
  const filteredCafes = getFilteredCafes();
  renderCafes(filteredCafes);
};

const requestUserLocation = () => {
  if (!navigator.geolocation) {
    cafeStatus.textContent =
      "Your browser does not support location. Showing all cafés instead.";

    updateCafeResults();
    return;
  }

  cafeStatus.textContent =
    "Finding cafés near you...";

  useLocationBtn?.setAttribute("disabled", "true");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      cafeStatus.textContent =
        "Showing geo-verified cafés nearest to you. Other cafés remain listed without distance.";

      useLocationBtn?.removeAttribute("disabled");

      updateCafeResults();
    },
    (error) => {
      userLocation = null;

      useLocationBtn?.removeAttribute("disabled");

      if (error.code === error.PERMISSION_DENIED) {
        cafeStatus.textContent =
          "Location permission was denied. You can still search by café name, suburb, city, or tag.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        cafeStatus.textContent =
          "Your location could not be determined. Showing all cafés instead.";
      } else if (error.code === error.TIMEOUT) {
        cafeStatus.textContent =
          "Location request timed out. Please try again.";
      } else {
        cafeStatus.textContent =
          "Location could not be loaded. Showing all cafés instead.";
      }

      updateCafeResults();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    }
  );
};

const setupCafeFinder = () => {
  if (!cafeResults) return;

  loadCafes();

  useLocationBtn?.addEventListener(
    "click",
    requestUserLocation
  );

  cafeSearchInput?.addEventListener(
    "input",
    updateCafeResults
  );

  ratingFilter?.addEventListener(
    "change",
    updateCafeResults
  );
};

setupMobileNav();
setupActiveNav();
setupSwiper();
setupCafeFinder();