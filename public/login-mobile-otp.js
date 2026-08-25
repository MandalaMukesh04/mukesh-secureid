const otpInputs =
    document.querySelectorAll(".otp-input");

const otpForm =
    document.getElementById(
        "login-mobile-otp-form"
    );

const otpMessage =
    document.getElementById(
        "otp-message"
    );

const resendButton =
    document.getElementById(
        "resend-login-mobile-otp"
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
   GET COMPLETE OTP
======================================== */

function getOTP() {

    return Array.from(
        otpInputs
    )
        .map(
            input => input.value
        )
        .join("");

}


/* ========================================
   VERIFY LOGIN MOBILE OTP
======================================== */

otpForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const otp =
            getOTP();


        if (otp.length !== 6) {

            otpMessage.textContent =
                "Please enter the complete 6-digit code.";

            otpMessage.style.color =
                "#dc2626";

            return;

        }


        try {

            const response =
                await fetch(
                    "/api/login/verify-mobile-otp",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                otp
                            })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                otpMessage.textContent =
                    data.message ||
                    "Verification failed.";

                otpMessage.style.color =
                    "#dc2626";

                return;

            }


            otpMessage.textContent =
                "Mobile verified successfully!";

            otpMessage.style.color =
                "#16a34a";


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
                "Mobile OTP verification error:",
                error
            );

            otpMessage.textContent =
                "Unable to connect to the server.";

            otpMessage.style.color =
                "#dc2626";

        }

    }
);


/* ========================================
   RESEND LOGIN MOBILE OTP
======================================== */

resendButton.addEventListener(
    "click",
    async () => {

        try {

            const response =
                await fetch(
                    "/api/login/resend-mobile-otp",
                    {
                        method: "POST"
                    }
                );

            const data =
                await response.json();


            otpMessage.textContent =
                data.message;

            otpMessage.style.color =
                response.ok
                    ? "#16a34a"
                    : "#dc2626";

        }

        catch (error) {

            console.error(
                "Resend mobile OTP error:",
                error
            );

            otpMessage.textContent =
                "Unable to connect to the server.";

            otpMessage.style.color =
                "#dc2626";

        }

    }
);