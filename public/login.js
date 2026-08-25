const loginForm = document.getElementById("login-form");

const loginEmail =
    document.getElementById("login-email");

const loginPassword =
    document.getElementById("login-password");

const loginError =
    document.getElementById("login-error");


loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // Clear previous error

        loginError.textContent = "";


        const email =
            loginEmail.value.trim();

        const password =
            loginPassword.value;


        // Basic validation

        if (!email || !password) {

            loginError.textContent =
                "Please enter your email and password.";

            return;
        }


        try {

            // Send login request to backend

            const response =
                await fetch("/api/login", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email: email,
                            password: password
                        })

                });


            const data =
                await response.json();


            // If login fails

            if (!response.ok) {

                loginError.textContent =
                    data.message ||
                    "Login failed. Please try again.";

                return;
            }


            // Login successful

            window.location.href =
                "login-verify.html";


        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            loginError.textContent =
                "Unable to connect to the server.";

        }

    }
);