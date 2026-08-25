const methodOptions =
    document.querySelectorAll(
        ".verification-option"
    );

const continueButton =
    document.getElementById(
        "continue-button"
    );

let selectedMethod = "";


/* ========================================
   SELECT VERIFICATION METHOD
======================================== */

methodOptions.forEach(
    (option) => {

        option.addEventListener(
            "click",
            function () {

                // Remove selection from all options
                methodOptions.forEach(
                    (item) => {
                        item.classList.remove(
                            "selected"
                        );
                    }
                );

                // Select clicked option
                option.classList.add(
                    "selected"
                );

                // Store selected method
                selectedMethod =
                    option.dataset.method;

                // Enable Continue button
                continueButton.disabled =
                    false;

            }
        );

    }
);


/* ========================================
   CONTINUE BUTTON
======================================== */

continueButton.addEventListener(
    "click",
    async function () {

        if (!selectedMethod) {
            return;
        }

        // Prevent multiple clicks
        continueButton.disabled = true;
        continueButton.textContent =
            "Please wait...";

        try {

            const response =
                await fetch(
                    "/api/login/send-verification",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                method:
                                    selectedMethod
                            })

                    }
                );

            const data =
                await response.json();


            /* ==============================
               BACKEND ERROR
            ============================== */

            if (!response.ok) {

                alert(
                    data.message ||
                    "Unable to start verification."
                );

                continueButton.disabled =
                    false;

                continueButton.textContent =
                    "Continue";

                return;
            }


            /* ==============================
               REDIRECT USER
            ============================== */

            // Email OTP
            if (
                selectedMethod ===
                "email"
            ) {

                window.location.href =
                    "login-email-otp.html";

            }


            // SMS OTP
            else if (
                selectedMethod ===
                "mobile"
            ) {

                window.location.href =
                    "login-mobile-otp.html";

            }


            // Authenticator App
            else if (
                selectedMethod ===
                "authenticator"
            ) {

                window.location.href =
                    "login-authenticator.html";

            }

        }

        catch (error) {

            console.error(
                "Verification error:",
                error
            );

            alert(
                "Unable to connect to the server."
            );

            continueButton.disabled =
                false;

            continueButton.textContent =
                "Continue";

        }

    }
);