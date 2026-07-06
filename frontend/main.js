const cafeResults = document.querySelector("#cafeResults");
const cafeStatus = document.querySelector("#cafeStatus");
const useLocationBtn = document.querySelector("#useLocationBtn");
const cafeSearchInput = document.querySelector("#cafeSearchInput");
const ratingFilter = document.querySelector("#ratingFilter");

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
  const currentPath = window.location.pathname;

  navLinks.forEach((navLink) => {
    if (navLink.href.includes(currentPath)) {
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

const loadCafes = async () => {
  try {
    const response = await fetch("data/cafes.json");

    if (!response.ok) {
      throw new Error("Could not load café data.");
    }

    cafes = await response.json();
    renderCafes(cafes);
  } catch (error) {
    if (cafeStatus) {
      cafeStatus.textContent = "Sorry, café data could not be loaded.";
    }

    console.error(error);
  }
};

const calculateDistanceKm = (userLat, userLng, cafeLat, cafeLng) => {
  const earthRadiusKm = 6371;

  const latDifference = degreesToRadians(cafeLat - userLat);
  const lngDifference = degreesToRadians(cafeLng - userLng);

  const userLatRadians = degreesToRadians(userLat);
  const cafeLatRadians = degreesToRadians(cafeLat);

  const haversineValue =
    Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos(userLatRadians) *
      Math.cos(cafeLatRadians) *
      Math.sin(lngDifference / 2) *
      Math.sin(lngDifference / 2);

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return earthRadiusKm * centralAngle;
};

const degreesToRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

const getCafesWithDistance = () => {
  if (!userLocation) return cafes;

  return cafes
    .map((cafe) => {
      const distance = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        cafe.latitude,
        cafe.longitude
      );

      return {
        ...cafe,
        distance,
      };
    })
    .sort((a, b) => a.distance - b.distance);
};

const filterCafes = () => {
  const searchTerm = cafeSearchInput?.value.toLowerCase().trim() || "";
  const minimumRating = Number(ratingFilter?.value || 0);

  const cafesToFilter = getCafesWithDistance();

  const filteredCafes = cafesToFilter.filter((cafe) => {
    const matchesSearch =
      cafe.name.toLowerCase().includes(searchTerm) ||
      cafe.address.toLowerCase().includes(searchTerm) ||
      cafe.tags.join(" ").toLowerCase().includes(searchTerm);

    const matchesRating = cafe.rating >= minimumRating;

    return matchesSearch && matchesRating;
  });

  renderCafes(filteredCafes);
};

const renderCafes = (cafesToRender) => {
  if (!cafeResults) return;

  cafeResults.innerHTML = "";

  if (cafesToRender.length === 0) {
    cafeResults.innerHTML = `
      <article class="cafe-card">
        <h3>No cafés found</h3>
        <p>Try a different search or lower the rating filter.</p>
      </article>
    `;
    return;
  }

  cafesToRender.forEach((cafe) => {
    const cafeCard = document.createElement("article");
    cafeCard.className = "cafe-card";

    const distanceText =
      typeof cafe.distance === "number"
        ? `<p class="cafe-distance">${cafe.distance.toFixed(1)} km away</p>`
        : "";

    cafeCard.innerHTML = `
      <h3>${cafe.name}</h3>
      <p>${cafe.address}</p>
      <p class="cafe-rating">Rating: ${cafe.rating} stars</p>
      ${distanceText}
      <div class="cafe-tags">
        ${cafe.tags.map((tag) => `<span>${tag}</span>`).join("")}
      </div>
    `;

    cafeResults.appendChild(cafeCard);
  });
};

const requestUserLocation = () => {
  if (!navigator.geolocation) {
    cafeStatus.textContent =
      "Your browser does not support location. Showing all cafés instead.";
    renderCafes(cafes);
    return;
  }

  cafeStatus.textContent = "Finding cafés near you...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      cafeStatus.textContent = "Showing cafés closest to your location.";
      filterCafes();
    },
    () => {
      userLocation = null;
      cafeStatus.textContent =
        "Location permission was denied. You can still search by café name, suburb, or city.";
      renderCafes(cafes);
    }
  );
};

const setupCafeFinder = () => {
  if (!cafeResults) return;

  loadCafes();

  useLocationBtn?.addEventListener("click", requestUserLocation);
  cafeSearchInput?.addEventListener("input", filterCafes);
  ratingFilter?.addEventListener("change", filterCafes);
};

setupMobileNav();
setupActiveNav();
setupSwiper();
setupCafeFinder();
  
  
  
  