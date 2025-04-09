import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { faSpinner, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    department: "",
    studentId: "",
    supervisorId: "",
    specialization: "",
  });

  useEffect(() => {
    // If user is already logged in, redirect based on role
    if (user) {
      redirectBasedOnRole(user);
    }
  }, [user]);

  const redirectBasedOnRole = (user) => {
    if (user.role === "admin" || user.role === "superadmin") {
      navigate("/admin/dashboard");
    } else if (user.role === "supervisor") {
      navigate("/supervisor/dashboard");
    } else if (user.role === "student") {
      navigate("/student/dashboard");
    }
  };

  const validateForm = () => {
    const errors = {};

    // Required fields
    if (!formData.fullName?.trim()) errors.fullName = "Full name is required";
    if (!formData.email?.trim()) errors.email = "Email is required";
    if (!formData.password) errors.password = "Password is required";
    if (!formData.confirmPassword)
      errors.confirmPassword = "Please confirm your password";
    if (!formData.department?.trim())
      errors.department = "Department is required";

    // Name validation
    if (
      formData.fullName &&
      !/^[a-zA-Z0-9\s\-\.,']{2,50}$/.test(formData.fullName.trim())
    ) {
      errors.fullName =
        "Name should be 2-50 characters and contain only letters, numbers, spaces, and basic punctuation";
    }

    // Email validation
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$/;
    if (formData.email && !emailRegex.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (formData.password && !passwordRegex.test(formData.password)) {
      errors.password =
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
    }

    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Department validation
    if (
      formData.department &&
      !/^[a-zA-Z\s&',.]{2,50}$/.test(formData.department.trim())
    ) {
      errors.department =
        "Department must be 2-50 characters and contain only letters, spaces, and basic punctuation";
    }

    // Role-specific validation
    if (formData.role === "supervisor") {
      if (!formData.specialization?.trim()) {
        errors.specialization = "Specialization is required for supervisors";
      } else if (
        !/^[a-zA-Z\s&',.]{2,50}$/.test(formData.specialization.trim())
      ) {
        errors.specialization =
          "Specialization must be 2-50 characters and contain only letters, spaces, and basic punctuation";
      }
    }

    // Optional ID validation
    if (formData.studentId && !/^STU\d{6}$/.test(formData.studentId)) {
      errors.studentId = "Student ID must start with STU followed by 6 digits";
    }
    if (formData.supervisorId && !/^SUP\d{6}$/.test(formData.supervisorId)) {
      errors.supervisorId =
        "Supervisor ID must start with SUP followed by 6 digits";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const { isValid, errors } = validateForm();
    if (!isValid) {
      setError(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { confirmPassword, ...registrationData } = formData;
      const result = await register(registrationData);

      if (result.success) {
        if (formData.role === "supervisor") {
          toast.success(
            "Registration successful! Your account will be reviewed by an admin."
          );
          navigate("/login");
        } else {
          toast.success("Registration successful!");
          // Redirect will be handled by useEffect when user state updates
        }
      } else {
        if (result.field) {
          setError({ [result.field]: result.error });
          toast.error(`${result.field}: ${result.error}`);
        } else {
          toast.error(result.error || "Registration failed");
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error.message || "Registration failed";
      setError({ form: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error when user starts typing
    if (error?.[name]) {
      setError((prev) => ({ ...prev, [name]: null }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader className="pb-4 text-center">
          <CardTitle className="text-2xl font-bold text-blue-800 dark:text-white">
            Create an Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="fullName"
                className="text-blue-800 dark:text-white"
              >
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
              {error?.fullName && (
                <p className="text-red-500 text-sm">{error.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-800 dark:text-white">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
              {error?.email && (
                <p className="text-red-500 text-sm">{error.email}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-blue-800 dark:text-white"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                />
                {error?.password && (
                  <p className="text-red-500 text-sm">{error.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-blue-800 dark:text-white"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                />
                {error?.confirmPassword && (
                  <p className="text-red-500 text-sm">
                    {error.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-blue-800 dark:text-white">
                Role
              </Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full p-2 border rounded border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              >
                <option value="student">Student</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="department"
                className="text-blue-800 dark:text-white"
              >
                Department
              </Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
              {error?.department && (
                <p className="text-red-500 text-sm">{error.department}</p>
              )}
            </div>

            {formData.role === "student" && (
              <div className="space-y-2">
                <Label
                  htmlFor="studentId"
                  className="text-blue-800 dark:text-white"
                >
                  Student ID (Optional)
                </Label>
                <Input
                  id="studentId"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  placeholder="e.g., STU123456"
                  className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                />
                {error?.studentId && (
                  <p className="text-red-500 text-sm">{error.studentId}</p>
                )}
              </div>
            )}

            {formData.role === "supervisor" && (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="supervisorId"
                    className="text-blue-800 dark:text-white"
                  >
                    Supervisor ID (Optional)
                  </Label>
                  <Input
                    id="supervisorId"
                    name="supervisorId"
                    value={formData.supervisorId}
                    onChange={handleChange}
                    placeholder="e.g., SUP123456"
                    className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                  />
                  {error?.supervisorId && (
                    <p className="text-red-500 text-sm">{error.supervisorId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="specialization"
                    className="text-blue-800 dark:text-white"
                  >
                    Specialization
                  </Label>
                  <Input
                    id="specialization"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    required
                    className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                  />
                  {error?.specialization && (
                    <p className="text-red-500 text-sm">
                      {error.specialization}
                    </p>
                  )}
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Registering...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                  Register
                </>
              )}
            </Button>

            <div className="text-center mt-4">
              <p className="text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Login here
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
