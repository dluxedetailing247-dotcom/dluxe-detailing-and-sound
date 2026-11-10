
/*
 D-LUXE DETAILING & SOUND
 Live Client Pricing v1

 Reads ONLY the public pricing function.

 The existing premium client portal handles:
 - Service selection
 - Customer details
 - Request submission
 - Photo uploads

 This file does not change those systems.
*/

"use strict";

(async function loadDluxePrices() {

  const config =
    window.DLUXE_CLIENT_CONFIG;

  const detailingBox =
    document.getElementById(
      "detailingServices"
    );

  const soundBox =
    document.getElementById(
      "soundServices"
    );

  const submitButton =
    document.getElementById(
      "submitButton"
    );

  // Prevent booking using outdated prices
  // while the current prices are loading.
  submitButton.disabled = true;

  detailingBox.textContent =
    "Loading current detailing prices...";

  soundBox.textContent =
    "Loading current sound prices...";

  function validPrice(value) {
    const price = Number(value);

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 1000000
    ) {
      throw new Error(
        "Invalid price received."
      );
    }

    return Math.round(price * 100) / 100;
  }

  try {

    if (
      !config ||
      !config.supabaseUrl ||
      !config.supabaseAnonKey
    ) {
      throw new Error(
        "Client configuration missing."
      );
    }

    const url =
      config.supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/rpc/dluxe_public_service_prices";

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "apikey":
          config.supabaseAnonKey,

        "Content-Type":
          "application/json"
      },

      body: "{}",

      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        "Pricing request failed: " +
        response.status
      );
    }

    const rows = await response.json();

    if (
      !Array.isArray(rows) ||
      rows.length === 0
    ) {
      throw new Error(
        "No active pricing available."
      );
    }

    // Convert official database names to
    // the names used by the premium portal.
    const displayNames = {
      "Custom Subwoofer Box":
        "Custom Box",

      "Premium/Luxury Detail":
        "Premium / Luxury Detail"
    };

    // Match database size keys to
    // the current portal size options.
    const sizeNames = {
      "Small": "Small",
      "Medium": "Medium",
      "Large": "Large",
      "XL/Luxury": "XL / Luxury",
      "XL / Luxury": "XL / Luxury"
    };

    const knownServices = new Map();

    for (const item of detailingServices) {
      knownServices.set(
        item.name,
        "detailing"
      );
    }

    for (const item of soundServices) {
      knownServices.set(
        item.name,
        "sound"
      );
    }

    const currentPrices = new Map();

    for (const row of rows) {

      if (
        !row ||
        typeof row.service_name !== "string"
      ) {
        throw new Error(
          "Invalid pricing record."
        );
      }

      const name =
        displayNames[row.service_name] ||
        row.service_name;

      const category =
        String(row.category || "")
          .toLowerCase();

      // Only publish services supported by
      // the existing D-LUXE client design.
      if (!knownServices.has(name)) {
        continue;
      }

      if (
        knownServices.get(name) !==
        category
      ) {
        throw new Error(
          "Service category mismatch."
        );
      }

      if (currentPrices.has(name)) {
        throw new Error(
          "Duplicate service pricing."
        );
      }

      const basePrice =
        validPrice(row.base_price);

      const sizePrices = {};

      const rawSizePrices =
        row.vehicle_prices;

      if (
        rawSizePrices !== null &&
        rawSizePrices !== undefined
      ) {

        if (
          typeof rawSizePrices !== "object" ||
          Array.isArray(rawSizePrices)
        ) {
          throw new Error(
            "Invalid vehicle pricing."
          );
        }

        for (
          const [size, amount]
          of Object.entries(rawSizePrices)
        ) {

          const displaySize =
            sizeNames[size];

          if (!displaySize) {
            continue;
          }

          sizePrices[displaySize] =
            validPrice(amount);
        }
      }

      currentPrices.set(name, {
        basePrice,
        sizePrices
      });
    }

    if (currentPrices.size === 0) {
      throw new Error(
        "No supported services found."
      );
    }

    // Hide services that are no longer
    // active in the administrator database.
    for (
      const list of [
        detailingServices,
        soundServices
      ]
    ) {

      for (
        let i = list.length - 1;
        i >= 0;
        i--
      ) {

        const service = list[i];

        const live =
          currentPrices.get(
            service.name
          );

        if (!live) {
          list.splice(i, 1);
          continue;
        }

        // Replace hardcoded starting price
        // with the official database price.
        service.price =
          live.basePrice;
      }
    }

    // Clear old hardcoded size prices.
    for (
      const size of
      Object.keys(vehiclePrices)
    ) {
      vehiclePrices[size] = {};
    }

    // Load current size-based prices.
    for (
      const [name, live]
      of currentPrices
    ) {

      for (
        const [size, price]
        of Object.entries(
          live.sizePrices
        )
      ) {

        if (!vehiclePrices[size]) {
          continue;
        }

        vehiclePrices[size][name] =
          price;
      }
    }

    // Preserve the existing portal's
    // selection and estimate functions.
    selectedServices = [];

    renderServices();

    updateSelection();

    // Re-enable booking once valid
    // official pricing is available.
    submitButton.disabled = false;

    setStatus(
      "Current D-LUXE prices loaded. Select up to 3 services.",
      ""
    );

  } catch (error) {

    console.error(
      "D-LUXE pricing:",
      error
    );

    // Do not let customers submit using
    // outdated or unverified display prices.
    detailingBox.textContent =
      "Current prices are temporarily unavailable.";

    soundBox.textContent =
      "Please contact D-LUXE for assistance.";

    submitButton.disabled = true;

    setStatus(
      "Unable to verify current prices. Please contact D-LUXE on 081 766 3556.",
      "error"
    );
  }

})();
