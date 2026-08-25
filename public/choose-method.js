document.addEventListener("DOMContentLoaded", () => {

    const options = document.querySelectorAll(".method-option");
    const continueBtn = document.getElementById("continueBtn");

    options.forEach(option => {

        option.addEventListener("click", () => {

            options.forEach(item => {
                item.classList.remove("active");
            });

            option.classList.add("active");

            const radio = option.querySelector("input");
            radio.checked = true;
        });

    });


    continueBtn.addEventListener("click", () => {

        const selectedMethod = document.querySelector(
            'input[name="verificationMethod"]:checked'
        );

        if (!selectedMethod) {
            alert("Please select a verification method.");
            return;
        }

        const method = selectedMethod.value;

        if (method === "email") {
            window.location.href = "email-otp.html";
        }

        else if (method === "sms") {
            window.location.href = "mobile-otp.html";
        }

        else if (method === "authenticator") {
            window.location.href = "mfa-setup.html";
        }

    });

});