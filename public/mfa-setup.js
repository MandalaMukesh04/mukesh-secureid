const mfaSecret = document.getElementById("mfa-secret");
const mfaForm = document.getElementById("mfa-form");
const mfaCodeInput = document.getElementById("mfa-code");
const mfaMessage = document.getElementById("mfa-message");
const skipMfaButton = document.getElementById("skip-mfa");
const mfaQr = document.getElementById("mfa-qr");

// Load MFA setup information
async function loadMfaSetup() {
    try {
        const response = await fetch("/api/mfa/setup");
        const data = await response.json();

        if (!response.ok) {
            mfaMessage.textContent =
                data.message || "Could not load MFA setup.";
            mfaMessage.style.color = "#dc2626";
            return;
        }

        mfaSecret.textContent = data.secret;
        mfaQr.src = data.qrCode;

    } catch (error) {
        console.error(error);

        mfaMessage.textContent =
            "Something went wrong while loading MFA.";
        mfaMessage.style.color = "#dc2626";
    }
}

loadMfaSetup();

// Allow numbers only
mfaCodeInput.addEventListener("input", () => {
    mfaCodeInput.value =
        mfaCodeInput.value.replace(/[^0-9]/g, "");
});

// Enable MFA
mfaForm.addEventListener("submit", async event => {
    event.preventDefault();

    const code = mfaCodeInput.value.trim();

    if (code.length !== 6) {
        mfaMessage.textContent =
            "Please enter a valid 6-digit code.";
        mfaMessage.style.color = "#dc2626";
        return;
    }

    try {
        const response = await fetch("/api/mfa/verify", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
            mfaMessage.textContent =
                data.message || "Invalid verification code.";
            mfaMessage.style.color = "#dc2626";
            return;
        }

        window.location.href = "/success.html";

    } catch (error) {
        console.error(error);

        mfaMessage.textContent =
            "Something went wrong.";
        mfaMessage.style.color = "#dc2626";
    }
});

// Skip MFA
skipMfaButton.addEventListener("click", async () => {
    try {
        await fetch("/api/mfa/skip", {
            method: "POST"
        });

        window.location.href = "/success.html";

    } catch (error) {
        console.error(error);
    }
});