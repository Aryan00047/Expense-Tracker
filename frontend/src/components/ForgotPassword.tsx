import { useState } from "react";
import { EnvelopeIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import FormError from "./FormError";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      let message = "Something went wrong";

      if (err instanceof Error) {
        message = err.message;
      }
      setErrorMessage(message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        
        {/* Header */}
        <div className="mb-4">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to sign in
          </Link>
        </div>

        {!submitted ? (
          <>
            <h2 className="text-2xl font-semibold mb-1">
              Forgot your password?
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we’ll send you a reset link.
            </p>

            <form noValidate onSubmit={onSubmit} className="space-y-4">
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-gray-100 px-10 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <FormError show={errorMessage!= null} message={errorMessage}/>
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl py-2 text-white transition ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-linear-to-r from-purple-500 to-blue-500"
                }`}
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              Check your email 📧
            </h2>
            <p className="text-sm text-gray-600">
              If an account exists for <span className="font-medium">{email}</span>,
              you’ll receive a password reset link shortly.
            </p>

            <div className="mt-6">
              <Link
                to="/login"
                className="text-sm text-purple-600 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
