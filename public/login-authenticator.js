const otpInputs =
    document.querySelectorAll(".otp-input");

const authenticatorForm =
    document.getElementById(
        "login-authenticator-form"
    );

const authenticatorMessage =
    document.getElementById(
        "authenticator-message"
    );


/* ========================================
   OTP INPUT HANDLING
======================================== */

otpInputs.forEach(
    (input, index) => {

        input.addEventListener(
            "input",
            () => {

                // Allow numbers only
                input.value =
                    input.value.replace(
                        /[^0-9]/g,
                        ""
                    );

                // Move to next input
                if (
                    input.value &&
                    index <
                    otpInputs.length - 1
                ) {

                    otpInputs[
                        index + 1
                    ].focus();

                }

            }
        );


        // Move back on Backspace
        input.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Backspace" &&
                    !input.value &&
                    index > 0
                ) {

                    otpInputs[
                        index - 1
                    ].focus();

                }

            }
        );

    }
);


/* ========================================
   GET AUTHENTICATOR CODE
======================================== */

function getAuthenticatorCode() {

    return Array.from(
        otpInputs
    )
        .map(
            input => input.value
        )
        .join("");

}


/* ========================================
   VERIFY AUTHENTICATOR CODE
======================================== */

authenticatorForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const code =
            getAuthenticatorCode();


        // Check code length
        if (code.length !== 6) {

            authenticatorMessage.textContent =
                "Please enter the complete 6-digit code.";

            authenticatorMessage.style.color =
                "#dc2626";

            return;

        }


        try {

            const response =
                await fetch(
                    "/api/login/verify-authenticator",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                code
                            })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                authenticatorMessage.textContent =
                    data.message ||
                    "Verification failed.";

                authenticatorMessage.style.color =
                    "#dc2626";

                return;

            }


            authenticatorMessage.textContent =
                "Authentication successful!";

            authenticatorMessage.style.color =
                "#16a34a";


            // Redirect to dashboard
            setTimeout(
                () => {

                    window.location.href =
                        "dashboard.html";

                },
                700
            );

        }

        catch (error) {

            console.error(
                "Authenticator login error:",
                error
            );

            authenticatorMessage.textContent =
                "Unable to connect to the server.";

            authenticatorMessage.style.color =
                "#dc2626";

        }

    }
);