const logoutButton =
    document.getElementById(
        "logout-button"
    );


/* ========================================
   CHECK AUTHENTICATION
======================================== */

async function checkAuthentication() {

    try {

        const response =
            await fetch(
                "/api/check-auth"
            );


        const data =
            await response.json();


        if (!response.ok ||
            !data.authenticated
        ) {

            window.location.href =
                "login.html";

            return;

        }


        console.log(
            "Authenticated user:",
            data.user
        );

    }

    catch (error) {

        console.error(
            "Authentication check error:",
            error
        );


        window.location.href =
            "login.html";

    }

}


/* ========================================
   LOGOUT
======================================== */

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            const response =
                await fetch(
                    "/api/logout",
                    {
                        method: "POST"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                alert(
                    data.message ||
                    "Logout failed."
                );

                return;

            }


            window.location.href =
                "login.html";

        }

        catch (error) {

            console.error(
                "Logout error:",
                error
            );


            alert(
                "Unable to connect to the server."
            );

        }

    }
);


/* ========================================
   RUN AUTH CHECK
======================================== */

checkAuthentication();