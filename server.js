require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");


const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "lax"
        }
    })
);

app.use(express.static(path.join(__dirname, "public")));

const usersFile = path.join(__dirname, "data", "users.json");

// Helper: read users
function getUsers() {
    const data = fs.readFileSync(usersFile, "utf8");

    if (!data.trim()) {
        return [];
    }

    return JSON.parse(data);
}

// Helper: save users
function saveUsers(users) {
    fs.writeFileSync(
        usersFile,
        JSON.stringify(users, null, 2)
    );
}

const challengesFile = path.join(
    __dirname,
    "data",
    "challenges.json"
);

// Read challenges
function getChallenges() {
    const data = fs.readFileSync(
        challengesFile,
        "utf8"
    );

    if (!data.trim()) {
        return [];
    }

    return JSON.parse(data);
}

// Save challenges
function saveChallenges(challenges) {
    fs.writeFileSync(
        challengesFile,
        JSON.stringify(challenges, null, 2)
    );
}

// Generate a 6-digit OTP
function generateOTP() {
    return crypto
        .randomInt(100000, 1000000)
        .toString();
}

// Register API
app.post("/api/register", async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            password
        } = req.body;

        if (!fullName || !email || !phone || !password) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        const validPassword =
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password);

        if (!validPassword) {
            return res.status(400).json({
                message: "Password does not meet requirements."
            });
        }

        const users = getUsers();

        const existingUser = users.find(
            user =>
                user.email.toLowerCase() ===
                email.toLowerCase()
        );

        if (existingUser) {
            return res.status(409).json({
                message:
                    "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        const newUser = {
            id: Date.now().toString(),
            fullName,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            emailVerified: false,
            mobileVerified: false,
            mfaEnabled: false,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);

        // Create Email OTP
        const otp = generateOTP();

        const otpHash = await bcrypt.hash(
            otp,
            10
        );

        const challenges = getChallenges();

        const challenge = {
            id: Date.now().toString(),
            userId: newUser.id,
            type: "email",
            otpHash,
            attempts: 0,
            maxAttempts: 5,
            expiresAt:
                Date.now() + 5 * 60 * 1000,
            used: false
        };

        challenges.push(challenge);
        saveChallenges(challenges);

        // Save user ID and challenge ID in session
        req.session.userId = newUser.id;
        req.session.emailChallengeId =
            challenge.id;

        // Simulated email
        console.log("\n==========================");
        console.log("EMAIL OTP");
        console.log("Email:", newUser.email);
        console.log("OTP:", otp);
        console.log("Expires in: 5 minutes");
        console.log("==========================\n");

        return res.status(201).json({
            message:
                "Registration successful. OTP sent.",
            nextStep: "email-verification"
        });

    } catch (error) {
        console.error(
            "Registration error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error."
        });
    }
});

// Verify Email OTP
app.post(
    "/api/verify-email-otp",
    async (req, res) => {
        try {
            const { otp } = req.body;

            if (!otp || otp.length !== 6) {
                return res.status(400).json({
                    message:
                        "Enter a valid 6-digit OTP."
                });
            }

            const challengeId =
                req.session.emailChallengeId;

            if (!challengeId) {
                return res.status(400).json({
                    message:
                        "No active email verification found."
                });
            }

            const challenges = getChallenges();

            const challenge = challenges.find(
                item => item.id === challengeId
            );

            if (!challenge) {
                return res.status(404).json({
                    message: "OTP not found."
                });
            }

            if (challenge.used) {
                return res.status(400).json({
                    message:
                        "This OTP has already been used."
                });
            }

            if (Date.now() > challenge.expiresAt) {
                return res.status(400).json({
                    message:
                        "OTP has expired. Please resend."
                });
            }

            if (
                challenge.attempts >=
                challenge.maxAttempts
            ) {
                return res.status(429).json({
                    message:
                        "Maximum attempts reached."
                });
            }

            const isCorrect =
                await bcrypt.compare(
                    otp,
                    challenge.otpHash
                );

            if (!isCorrect) {
                challenge.attempts += 1;
                saveChallenges(challenges);

                const remaining =
                    challenge.maxAttempts -
                    challenge.attempts;

                return res.status(400).json({
                    message:
                        `Incorrect OTP. ${remaining} attempts remaining.`
                });
            }

            // Mark OTP as used
            challenge.used = true;
            saveChallenges(challenges);

            // Update user verification status
            const users = getUsers();

            const user = users.find(
                item =>
                    item.id === req.session.userId
            );

            if (user) {
                user.emailVerified = true;
                saveUsers(users);
            }

            // Create SMS OTP
const smsOtp = generateOTP();

const smsOtpHash = await bcrypt.hash(
    smsOtp,
    10
);

// Create a unique SMS challenge
const smsChallenge = {
    id:
        Date.now().toString() +
        "-sms",
    userId: req.session.userId,
    type: "sms",
    otpHash: smsOtpHash,
    attempts: 0,
    maxAttempts: 5,
    expiresAt:
        Date.now() + 5 * 60 * 1000,
    used: false
};

challenges.push(smsChallenge);

saveChallenges(challenges);

req.session.smsChallengeId =
    smsChallenge.id;

// Simulated SMS
console.log("\n==========================");
console.log("SMS OTP");
console.log("Mobile:", user.phone);
console.log("OTP:", smsOtp);
console.log("Expires in: 5 minutes");
console.log("==========================\n");

return res.json({
    message:
        "Email verified successfully. SMS OTP sent."
});

        } catch (error) {
            console.error(
                "Email OTP verification error:",
                error
            );

            return res.status(500).json({
                message: "Internal server error."
            });
        }
    }
);

// Resend Email OTP
app.post(
    "/api/send-email-otp",
    async (req, res) => {
        try {
            const userId =
                req.session.userId;

            if (!userId) {
                return res.status(400).json({
                    message:
                        "No registration session found."
                });
            }

            const users = getUsers();

            const user = users.find(
                item => item.id === userId
            );

            if (!user) {
                return res.status(404).json({
                    message:
                        "User not found."
                });
            }

            const otp = generateOTP();

            const otpHash =
                await bcrypt.hash(otp, 10);

            const challenges =
                getChallenges();

            const challenge = {
                id:
                    Date.now().toString() +
                    "-resend",
                userId,
                type: "email",
                otpHash,
                attempts: 0,
                maxAttempts: 5,
                expiresAt:
                    Date.now() +
                    5 * 60 * 1000,
                used: false
            };

            challenges.push(challenge);
            saveChallenges(challenges);

            req.session.emailChallengeId =
                challenge.id;

            console.log("\n==========================");
            console.log("RESEND EMAIL OTP");
            console.log("Email:", user.email);
            console.log("OTP:", otp);
            console.log("Expires in: 5 minutes");
            console.log("==========================\n");

            return res.json({
                message:
                    "A new OTP has been sent."
            });

        } catch (error) {
            console.error(
                "Resend OTP error:",
                error
            );

            return res.status(500).json({
                message: "Internal server error."
            });
        }
    }
);

// Verify SMS OTP
app.post("/api/verify-sms-otp", async (req, res) => {

    try {

        const { otp } = req.body;

        if (!otp || otp.length !== 6) {
            return res.status(400).json({
                message:
                    "Enter a valid 6-digit OTP."
            });
        }

        const challengeId =
            req.session.smsChallengeId;

        if (!challengeId) {
            return res.status(400).json({
                message:
                    "No active mobile verification found."
            });
        }

        const challenges = getChallenges();

        const challenge = challenges.find(
            item => item.id === challengeId
        );

        if (!challenge) {
            return res.status(404).json({
                message: "OTP not found."
            });
        }

        if (challenge.used) {
            return res.status(400).json({
                message:
                    "This OTP has already been used."
            });
        }

        if (Date.now() > challenge.expiresAt) {
            return res.status(400).json({
                message:
                    "OTP has expired. Please resend."
            });
        }

        if (
            challenge.attempts >=
            challenge.maxAttempts
        ) {
            return res.status(429).json({
                message:
                    "Maximum attempts reached. Please resend OTP."
            });
        }

        const isCorrect =
            await bcrypt.compare(
                otp,
                challenge.otpHash
            );

        if (!isCorrect) {

            challenge.attempts += 1;

            saveChallenges(challenges);

            const remaining =
                challenge.maxAttempts -
                challenge.attempts;

            if (remaining <= 0) {
                return res.status(429).json({
                    message:
                        "Maximum attempts reached. Please resend OTP."
                });
            }

            return res.status(400).json({
                message:
                    `Incorrect OTP. ${remaining} attempts remaining.`
            });
        }

        // Mark OTP as used
        challenge.used = true;

        saveChallenges(challenges);

        // Update user
        const users = getUsers();

        const user = users.find(
            item =>
                item.id === req.session.userId
        );

        if (user) {

            user.mobileVerified = true;

            saveUsers(users);
        }

        return res.json({
            message:
                "Mobile verified successfully!"
        });

    } catch (error) {

        console.error(
            "SMS OTP verification error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }

});


// Resend SMS OTP
app.post("/api/send-sms-otp", async (req, res) => {

    try {

        const userId =
            req.session.userId;

        if (!userId) {
            return res.status(400).json({
                message:
                    "No registration session found."
            });
        }

        const users = getUsers();

        const user = users.find(
            item => item.id === userId
        );

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found."
            });
        }

        const smsOtp = generateOTP();

        const smsOtpHash =
            await bcrypt.hash(
                smsOtp,
                10
            );

        const challenges =
            getChallenges();

        const smsChallenge = {
            id:
                Date.now().toString() +
                "-sms-resend",

            userId,

            type: "sms",

            otpHash: smsOtpHash,

            attempts: 0,

            maxAttempts: 5,

            expiresAt:
                Date.now() +
                5 * 60 * 1000,

            used: false
        };

        challenges.push(smsChallenge);

        saveChallenges(challenges);

        req.session.smsChallengeId =
            smsChallenge.id;

        console.log("\n==========================");
        console.log("RESEND SMS OTP");
        console.log("Mobile:", user.phone);
        console.log("OTP:", smsOtp);
        console.log("Expires in: 5 minutes");
        console.log("==========================\n");

        return res.json({
            message:
                "A new SMS OTP has been sent."
        });

    } catch (error) {

        console.error(
            "Resend SMS OTP error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });

    }

});

// Generate MFA setup secret
app.get("/api/mfa/setup", async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({
                message: "No active user session found."
            });
        }

        const users = getUsers();

        const user = users.find(
            item => item.id === userId
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Generate a new MFA secret
        const secret = speakeasy.generateSecret({
            name: `SecureID (${user.email})`
        });

        // Store temporarily in session
        req.session.tempMfaSecret = secret.base32;

        // Generate QR code
        const qrCode = await QRCode.toDataURL(
            secret.otpauth_url
        );

        return res.json({
            secret: secret.base32,
            qrCode
        });

    } catch (error) {
        console.error("MFA setup error:", error);

        return res.status(500).json({
            message: "Could not generate MFA setup."
        });
    }
});


// Verify MFA code
app.post("/api/mfa/verify", (req, res) => {
    try {
        const { code } = req.body;

        const userId = req.session.userId;
        const tempSecret = req.session.tempMfaSecret;

        if (!userId || !tempSecret) {
            return res.status(400).json({
                message: "MFA setup session not found."
            });
        }

        if (!code || code.length !== 6) {
            return res.status(400).json({
                message: "Enter a valid 6-digit code."
            });
        }

        const verified = speakeasy.totp.verify({
            secret: tempSecret,
            encoding: "base32",
            token: code,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({
                message: "Invalid MFA code. Try again."
            });
        }

        const users = getUsers();

        const user = users.find(
            item => item.id === userId
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Save MFA settings
        user.mfaEnabled = true;
        user.mfaSecret = tempSecret;

        saveUsers(users);

        // Remove temporary secret
        delete req.session.tempMfaSecret;

        return res.json({
            message: "MFA enabled successfully!"
        });

    } catch (error) {
        console.error("MFA verification error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
});


// Skip MFA
app.post("/api/mfa/skip", (req, res) => {
    try {
        const userId = req.session.userId;

        if (userId) {
            const users = getUsers();

            const user = users.find(
                item => item.id === userId
            );

            if (user) {
                user.mfaEnabled = false;
                saveUsers(users);
            }
        }

        delete req.session.tempMfaSecret;

        return res.json({
            message: "MFA setup skipped."
        });

    } catch (error) {
        console.error("MFA skip error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
});

// Login user
app.post("/api/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        // Check if fields are empty
        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required."
            });
        }

        const users = getUsers();

        // Find user by email
        const user = users.find(
            item =>
                item.email.toLowerCase() ===
                email.toLowerCase()
        );

        // User does not exist
        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password."
            });
        }

        // Compare entered password with hashed password
        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatches) {
            return res.status(401).json({
                message:
                    "Invalid email or password."
            });
        }

        // Login successful
        req.session.userId = user.id;

        return res.json({
            message: "Login successful!",
            nextStep: "verification"
        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });

    }

});

app.post("/api/login/send-verification", async (req, res) => {

    try {

        const { method } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({
                message: "Login session not found."
            });
        }

        const users = getUsers();

        const user = users.find(
            item => item.id === userId
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (
            !["email", "mobile", "authenticator"]
                .includes(method)
        ) {
            return res.status(400).json({
                message: "Invalid verification method."
            });
        }

        // Authenticator login
        if (method === "authenticator") {

            if (!user.mfaEnabled || !user.mfaSecret) {
                return res.status(400).json({
                    message:
                        "Authenticator App is not enabled for this account."
                });
            }

            req.session.loginVerificationMethod =
                "authenticator";

            return res.json({
                message:
                    "Enter the code from your authenticator app."
            });
        }

        // Generate OTP for Email or Mobile
        const otp = generateOTP();

        const otpHash = await bcrypt.hash(
            otp,
            10
        );

        const challenges = getChallenges();

        const type =
            method === "email"
                ? "login-email"
                : "login-sms";

        const challenge = {
            id: Date.now().toString() + "-" + type,
            userId,
            type,
            otpHash,
            attempts: 0,
            maxAttempts: 5,
            expiresAt:
                Date.now() + 5 * 60 * 1000,
            used: false
        };

        challenges.push(challenge);
        saveChallenges(challenges);

        req.session.loginChallengeId =
            challenge.id;

        req.session.loginVerificationMethod =
            method;

        console.log("\n==========================");

        if (method === "email") {
            console.log("LOGIN EMAIL OTP");
            console.log("Email:", user.email);
        } else {
            console.log("LOGIN SMS OTP");
            console.log("Mobile:", user.phone);
        }

        console.log("OTP:", otp);
        console.log("Expires in: 5 minutes");

        console.log("==========================\n");

        return res.json({
            message:
                "Verification OTP generated successfully."
        });

    } catch (error) {

        console.error(
            "Login verification error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error."
        });
    }

});

/* ========================================
   VERIFY LOGIN EMAIL OTP
======================================== */

app.post(
    "/api/login/verify-email-otp",
    async (req, res) => {

        try {

            const { otp } = req.body;

            const userId =
                req.session.userId;

            const challengeId =
                req.session.loginChallengeId;


            if (!userId || !challengeId) {

                return res.status(401).json({
                    message:
                        "Login verification session not found."
                });

            }


            if (
                req.session.loginVerificationMethod !==
                "email"
            ) {

                return res.status(400).json({
                    message:
                        "Invalid verification method."
                });

            }


            if (
                !otp ||
                otp.length !== 6
            ) {

                return res.status(400).json({
                    message:
                        "Enter a valid 6-digit OTP."
                });

            }


            const challenges =
                getChallenges();


            const challenge =
                challenges.find(
                    item =>
                        item.id === challengeId &&
                        item.userId === userId &&
                        item.type === "login-email"
                );


            if (!challenge) {

                return res.status(404).json({
                    message:
                        "Login OTP not found."
                });

            }


            if (challenge.used) {

                return res.status(400).json({
                    message:
                        "This OTP has already been used."
                });

            }


            if (
                Date.now() >
                challenge.expiresAt
            ) {

                return res.status(400).json({
                    message:
                        "OTP has expired. Please resend."
                });

            }


            if (
                challenge.attempts >=
                challenge.maxAttempts
            ) {

                return res.status(429).json({
                    message:
                        "Maximum attempts reached. Please resend OTP."
                });

            }


            const isCorrect =
                await bcrypt.compare(
                    otp,
                    challenge.otpHash
                );


            if (!isCorrect) {

                challenge.attempts += 1;

                saveChallenges(
                    challenges
                );


                const remaining =
                    challenge.maxAttempts -
                    challenge.attempts;


                return res.status(400).json({
                    message:
                        `Incorrect OTP. ${remaining} attempts remaining.`
                });

            }


            // Mark OTP as used
            challenge.used = true;

            saveChallenges(
                challenges
            );


            // Mark login verification as complete
            req.session.loginVerified =
                true;


            return res.json({
                message:
                    "Email verified successfully!"
            });

        }

        catch (error) {

            console.error(
                "Login email OTP error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });

        }

    }
);

/* ========================================
   RESEND LOGIN EMAIL OTP
======================================== */

app.post(
    "/api/login/resend-email-otp",
    async (req, res) => {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    message:
                        "Login session not found."
                });

            }


            const users =
                getUsers();


            const user =
                users.find(
                    item =>
                        item.id === userId
                );


            if (!user) {

                return res.status(404).json({
                    message:
                        "User not found."
                });

            }


            // Generate new OTP
            const otp =
                generateOTP();


            const otpHash =
                await bcrypt.hash(
                    otp,
                    10
                );


            const challenges =
                getChallenges();


            // Mark previous login email OTP as used
            challenges.forEach(
                challenge => {

                    if (
                        challenge.userId ===
                        userId &&

                        challenge.type ===
                        "login-email" &&

                        !challenge.used
                    ) {

                        challenge.used =
                            true;

                    }

                }
            );


            // Create new challenge
            const newChallenge = {

                id:
                    Date.now().toString() +
                    "-login-email",

                userId,

                type:
                    "login-email",

                otpHash,

                attempts: 0,

                maxAttempts: 5,

                expiresAt:
                    Date.now() +
                    5 * 60 * 1000,

                used: false

            };


            challenges.push(
                newChallenge
            );


            saveChallenges(
                challenges
            );


            // Update session
            req.session.loginChallengeId =
                newChallenge.id;

            req.session.loginVerificationMethod =
                "email";


            // Simulated Email
            console.log(
                "\n=========================="
            );

            console.log(
                "RESEND LOGIN EMAIL OTP"
            );

            console.log(
                "Email:",
                user.email
            );

            console.log(
                "OTP:",
                otp
            );

            console.log(
                "Expires in: 5 minutes"
            );

            console.log(
                "==========================\n"
            );


            return res.json({
                message:
                    "A new OTP has been generated. Check the terminal."
            });

        }

        catch (error) {

            console.error(
                "Login resend email OTP error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });

        }

    }
);

/* ========================================
   SEND LOGIN VERIFICATION
======================================== */

app.post(
    "/api/login/send-verification",
    async (req, res) => {

        try {

            const { method } = req.body;

            const userId =
                req.session.userId;

            if (!userId) {

                return res.status(401).json({
                    message:
                        "Login session not found."
                });

            }

            const users = getUsers();

            const user = users.find(
                item => item.id === userId
            );

            if (!user) {

                return res.status(404).json({
                    message:
                        "User not found."
                });

            }


            /* ==============================
               EMAIL OTP
            ============================== */

            if (method === "email") {

                const otp = generateOTP();

                const otpHash =
                    await bcrypt.hash(
                        otp,
                        10
                    );

                const challenges =
                    getChallenges();

                const challenge = {

                    id:
                        Date.now().toString() +
                        "-login-email",

                    userId,

                    type:
                        "login-email",

                    otpHash,

                    attempts: 0,

                    maxAttempts: 5,

                    expiresAt:
                        Date.now() +
                        5 * 60 * 1000,

                    used: false

                };

                challenges.push(
                    challenge
                );

                saveChallenges(
                    challenges
                );


                req.session.loginChallengeId =
                    challenge.id;

                req.session.loginVerificationMethod =
                    "email";


                console.log(
                    "\n=========================="
                );

                console.log(
                    "LOGIN EMAIL OTP"
                );

                console.log(
                    "Email:",
                    user.email
                );

                console.log(
                    "OTP:",
                    otp
                );

                console.log(
                    "Expires in: 5 minutes"
                );

                console.log(
                    "==========================\n"
                );


                return res.json({
                    message:
                        "Email OTP generated successfully."
                });

            }


            /* ==============================
               MOBILE OTP
            ============================== */

            if (method === "mobile") {

                const otp = generateOTP();

                const otpHash =
                    await bcrypt.hash(
                        otp,
                        10
                    );

                const challenges =
                    getChallenges();

                const challenge = {

                    id:
                        Date.now().toString() +
                        "-login-mobile",

                    userId,

                    type:
                        "login-mobile",

                    otpHash,

                    attempts: 0,

                    maxAttempts: 5,

                    expiresAt:
                        Date.now() +
                        5 * 60 * 1000,

                    used: false

                };

                challenges.push(
                    challenge
                );

                saveChallenges(
                    challenges
                );


                req.session.loginChallengeId =
                    challenge.id;

                req.session.loginVerificationMethod =
                    "mobile";


                console.log(
                    "\n=========================="
                );

                console.log(
                    "LOGIN SMS OTP"
                );

                console.log(
                    "Mobile:",
                    user.phone
                );

                console.log(
                    "OTP:",
                    otp
                );

                console.log(
                    "Expires in: 5 minutes"
                );

                console.log(
                    "==========================\n"
                );


                return res.json({
                    message:
                        "Mobile OTP generated successfully."
                });

            }


            /* ==============================
               AUTHENTICATOR
            ============================== */

            if (method === "authenticator") {

                req.session.loginVerificationMethod =
                    "authenticator";

                return res.json({
                    message:
                        "Authenticator verification selected."
                });

            }


            return res.status(400).json({
                message:
                    "Invalid verification method."
            });

        }

        catch (error) {

            console.error(
                "Login verification error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });

        }

    }
);

/* ========================================
   LOGOUT USER
======================================== */

app.post(
    "/api/logout",
    (req, res) => {

        req.session.destroy(
            (error) => {

                if (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    return res.status(500).json({
                        message:
                            "Unable to logout."
                    });

                }


                res.clearCookie(
                    "connect.sid"
                );


                return res.json({
                    message:
                        "Logged out successfully."
                });

            }
        );

    }
);

/* ========================================
   VERIFY LOGIN MOBILE OTP
======================================== */

app.post(
    "/api/login/verify-mobile-otp",
    async (req, res) => {

        try {

            const { otp } = req.body;

            const userId =
                req.session.userId;

            const challengeId =
                req.session.loginChallengeId;


            if (!userId || !challengeId) {

                return res.status(401).json({
                    message:
                        "Login verification session not found."
                });

            }


            if (
                req.session.loginVerificationMethod !==
                "mobile"
            ) {

                return res.status(400).json({
                    message:
                        "Invalid verification method."
                });

            }


            if (!otp || otp.length !== 6) {

                return res.status(400).json({
                    message:
                        "Enter a valid 6-digit OTP."
                });

            }


            const challenges =
                getChallenges();


            const challenge =
                challenges.find(
                    item =>
                        item.id === challengeId &&
                        item.userId === userId &&
                        item.type === "login-mobile"
                );


            if (!challenge) {

                return res.status(404).json({
                    message:
                        "Login mobile OTP not found."
                });

            }


            if (challenge.used) {

                return res.status(400).json({
                    message:
                        "This OTP has already been used."
                });

            }


            if (Date.now() > challenge.expiresAt) {

                return res.status(400).json({
                    message:
                        "OTP has expired. Please resend."
                });

            }


            if (
                challenge.attempts >=
                challenge.maxAttempts
            ) {

                return res.status(429).json({
                    message:
                        "Maximum attempts reached. Please resend OTP."
                });

            }


            const isCorrect =
                await bcrypt.compare(
                    otp,
                    challenge.otpHash
                );


            if (!isCorrect) {

                challenge.attempts += 1;

                saveChallenges(
                    challenges
                );

                const remaining =
                    challenge.maxAttempts -
                    challenge.attempts;


                return res.status(400).json({
                    message:
                        `Incorrect OTP. ${remaining} attempts remaining.`
                });

            }


            // Mark OTP as used
            challenge.used = true;

            saveChallenges(
                challenges
            );


            // Mark login as verified
            req.session.loginVerified = true;


            return res.json({
                message:
                    "Mobile verified successfully!"
            });

        }

        catch (error) {

            console.error(
                "Login mobile OTP error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });

        }

    }
);

/* ========================================
   RESEND LOGIN MOBILE OTP
======================================== */

app.post(
    "/api/login/resend-mobile-otp",
    async (req, res) => {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    message:
                        "Login session not found."
                });

            }


            const users =
                getUsers();


            const user =
                users.find(
                    item =>
                        item.id === userId
                );


            if (!user) {

                return res.status(404).json({
                    message:
                        "User not found."
                });

            }


            // Generate new OTP
            const otp =
                generateOTP();


            const otpHash =
                await bcrypt.hash(
                    otp,
                    10
                );


            const challenges =
                getChallenges();


            // Disable previous unused mobile OTPs
            challenges.forEach(
                challenge => {

                    if (
                        challenge.userId === userId &&
                        challenge.type === "login-mobile" &&
                        !challenge.used
                    ) {

                        challenge.used = true;

                    }

                }
            );


            // Create new mobile OTP
            const newChallenge = {

                id:
                    Date.now().toString() +
                    "-login-mobile",

                userId,

                type:
                    "login-mobile",

                otpHash,

                attempts: 0,

                maxAttempts: 5,

                expiresAt:
                    Date.now() +
                    5 * 60 * 1000,

                used: false

            };


            challenges.push(
                newChallenge
            );

            saveChallenges(
                challenges
            );


            // Update session
            req.session.loginChallengeId =
                newChallenge.id;

            req.session.loginVerificationMethod =
                "mobile";


            // Simulated SMS OTP
            console.log(
                "\n=========================="
            );

            console.log(
                "RESEND LOGIN SMS OTP"
            );

            console.log(
                "Mobile:",
                user.phone
            );

            console.log(
                "OTP:",
                otp
            );

            console.log(
                "Expires in: 5 minutes"
            );

            console.log(
                "==========================\n"
            );


            return res.json({
                message:
                    "A new mobile OTP has been generated. Check the terminal."
            });

        }

        catch (error) {

            console.error(
                "Login resend mobile OTP error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });

        }

    }
);

/* ========================================
   VERIFY LOGIN AUTHENTICATOR
======================================== */

app.post(
    "/api/login/verify-authenticator",
    (req, res) => {

        try {

            const { code } = req.body;

            const userId =
                req.session.userId;


            /* ------------------------
               CHECK LOGIN SESSION
            ------------------------ */

            if (!userId) {

                return res.status(401).json({
                    message:
                        "Login session not found."
                });

            }


            /* ------------------------
               CHECK MFA ENABLED
            ------------------------ */

            const users =
                getUsers();


            const user =
                users.find(
                    item =>
                        item.id === userId
                );


            if (!user) {

                return res.status(404).json({
                    message:
                        "User not found."
                });

            }


            if (
                !user.mfaEnabled ||
                !user.mfaSecret
            ) {

                return res.status(400).json({
                    message:
                        "Authenticator App is not enabled for this account."
                });

            }


            /* ------------------------
               VALIDATE CODE
            ------------------------ */

            if (
                !code ||
                code.length !== 6
            ) {

                return res.status(400).json({
                    message:
                        "Enter a valid 6-digit code."
                });

            }


            /* ------------------------
               VERIFY TOTP CODE
            ------------------------ */

            const verified =
                speakeasy.totp.verify({

                    secret:
                        user.mfaSecret,

                    encoding:
                        "base32",

                    token:
                        code,

                    window: 1

                });


            if (!verified) {

                return res.status(400).json({
                    message:
                        "Invalid authenticator code. Try again."
                });

            }


            /* ------------------------
               LOGIN SUCCESS
            ------------------------ */

            req.session.loginVerified =
                true;


            return res.json({

                message:
                    "Authenticator verified successfully!"

            });

        }

        catch (error) {

            console.error(
                "Login authenticator error:",
                error
            );


            return res.status(500).json({

                message:
                    "Internal server error."

            });

        }

    }
);

/* ========================================
   CHECK AUTHENTICATION
======================================== */

app.get(
    "/api/check-auth",
    (req, res) => {

        try {

            if (
                !req.session.userId ||
                !req.session.loginVerified
            ) {

                return res.status(401).json({
                    authenticated: false,
                    message:
                        "You are not authorized to access this page."
                });

            }


            const users = getUsers();

            const user = users.find(
                item =>
                    item.id === req.session.userId
            );


            if (!user) {

                return res.status(401).json({
                    authenticated: false
                });

            }


            return res.json({

                authenticated: true,

                user: {
                    fullName:
                        user.fullName,

                    email:
                        user.email
                }

            });

        }

        catch (error) {

            console.error(
                "Authentication check error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });

        }

    }
);

// Test API
app.get("/api/test", (req, res) => {
    res.json({
        message: "SecureID backend is working!"
    });
});

/* ========================================
   START SERVER
======================================== */

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `Server running at http://localhost:${PORT}`
        );
    });
}

module.exports = app;