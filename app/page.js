javascript
export default function Home() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>✅ App is working!</h1>
      <p>If you see this, the deployment is successful.</p>
      <p>
        <a href="/login" style={{ color: "blue" }}>Login</a> or{" "}
        <a href="/signup" style={{ color: "blue" }}>Sign up</a>
      </p>
    </div>
  );
}
