const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");

const ruleLength = document.getElementById("rule-length");
const ruleUpper = document.getElementById("rule-upper");
const ruleNumber = document.getElementById("rule-number");
const ruleSpecial = document.getElementById("rule-special");

const registerForm = document.getElementById("register-form");

// Show / Hide password
togglePassword.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "🙈";
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "👁";
    }
});

// Password validation
passwordInput.addEventListener("input", () => {
    const password = passwordInput.value;

    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    updateRule(
        ruleLength,
        hasLength,
        "At least 8 characters"
    );

    updateRule(
        ruleUpper,
        hasUpper,
        "1 uppercase letter"
    );

    updateRule(
        ruleNumber,
        hasNumber,
        "1 number"
    );

    updateRule(
        ruleSpecial,
        hasSpecial,
        "1 special character"
    );
});

function updateRule(element, valid, text) {
    if (valid) {
        element.classList.add("valid");
        element.textContent = "✓ " + text;
    } else {
        element.classList.remove("valid");
        element.textContent = "○ " + text;
    }
}

// Form submission
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = passwordInput.value;
    const terms = document.getElementById("terms").checked;

    if (!fullName || !email || !phone || !password) {
        alert("Please fill in all fields.");
        return;
    }

    if (!terms) {
        alert("Please accept the Terms & Conditions.");
        return;
    }

    if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
    ) {
        alert("Please meet all password requirements.");
        return;
    }

    const submitButton = document.querySelector(".primary-button");

    submitButton.textContent = "Creating Account...";
    submitButton.disabled = true;

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fullName,
                email,
                phone,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Registration failed.");
            return;
        }

        window.location.href = "/email-otp.html";

    } catch (error) {
        console.error(error);
        alert("Something went wrong. Please try again.");
    } finally {
        submitButton.textContent = "Create Account";
        submitButton.disabled = false;
    }
});