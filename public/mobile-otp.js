const otpInputs = document.querySelectorAll(".otp-input");

const otpForm =
    document.getElementById("mobile-otp-form");

const otpMessage =
    document.getElementById("otp-message");

const resendButton =
    document.getElementById("resend-mobile-otp");

otpInputs.forEach((input, index) => {

    input.addEventListener("input", () => {

        input.value =
            input.value.replace(/[^0-9]/g, "");

        if (
            input.value &&
            index < otpInputs.length - 1
        ) {
            otpInputs[index + 1].focus();
        }

    });

    input.addEventListener("keydown", event => {

        if (
            event.key === "Backspace" &&
            !input.value &&
            index > 0
        ) {
            otpInputs[index - 1].focus();
        }

    });

});

function getOTP() {

    return Array.from(otpInputs)
        .map(input => input.value)
        .join("");

}

otpForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const otp = getOTP();

        if (otp.length !== 6) {

            otpMessage.textContent =
                "Please enter the complete 6-digit code.";

            otpMessage.style.color = "#dc2626";

            return;
        }

        try {

            const response =
                await fetch("/api/verify-sms-otp", {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({ otp })
                });

            const data =
                await response.json();

            if (!response.ok) {

                otpMessage.textContent =
                    data.message;

                otpMessage.style.color =
                    "#dc2626";

                return;
            }

            // Next step: MFA setup
            window.location.href =
                "/mfa-setup.html";

        } catch (error) {

            console.error(error);

            otpMessage.textContent =
                "Something went wrong.";

            otpMessage.style.color =
                "#dc2626";

        }

    }
);

resendButton.addEventListener(
    "click",
    async () => {

        try {

            const response =
                await fetch(
                    "/api/send-sms-otp",
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

        } catch (error) {

            otpMessage.textContent =
                "Could not resend OTP.";

            otpMessage.style.color =
                "#dc2626";

        }

    }
);