const BASE = "http://localhost:3000";
const HEADERS = {
  "Content-Type": "application/json",
  Origin: BASE,
};

async function main() {
  // Test sign-up
  const signUpRes = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      name: "Admin",
      email: "admin@digest.local",
      password: "admin12345678",
    }),
  });
  console.log("Sign-up:", signUpRes.status);
  const signUpBody = await signUpRes.text();
  console.log(signUpBody.slice(0, 500));

  // Test sign-in
  const signInRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      email: "admin@digest.local",
      password: "admin12345678",
    }),
  });
  console.log("\nSign-in:", signInRes.status);
  const signInBody = await signInRes.text();
  console.log(signInBody.slice(0, 500));
}

main().catch(console.error);
