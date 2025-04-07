import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { faSpinner, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    department: "",
    studentId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    if (!formData.department) newErrors.department = "Department is required";
    if (formData.studentId && !/^STU\d{6}$/.test(formData.studentId)) {
      newErrors.studentId = "Student ID must start with STU followed by 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await register(formData);
      if (result.success) {
        toast.success("Registration successful!");
        if (formData.role === "supervisor") {
          toast.info("Your account is pending approval. You will be notified once approved.");
          navigate("/login");
        } else {
          // For students, they will be automatically redirected to their dashboard
          navigate("/student/dashboard");
        }
      } else {
        toast.error(result.error || "Registration failed");
        if (result.field) {
          setErrors({ [result.field]: result.error });
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg">
      <CardHeader className="pb-4 text-center">
        <CardTitle className="text-2xl font-bold text-blue-800 dark:text-white">
          Create an Account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-blue-800 dark:text-white">
              Full Name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              className={`border ${
                errors.fullName ? "border-red-500" : "border-gray-300"
              } dark:border-gray-700 dark:bg-gray-700 dark:text-white`}
            />
            {errors.fullName && (
              <p className="text-red-500 text-sm">{errors.fullName}</p>
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
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              className={`border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } dark:border-gray-700 dark:bg-gray-700 dark:text-white`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-800 dark:text-white">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={`border ${
                  errors.password ? "border-red-500" : "border-gray-300"
                } dark:border-gray-700 dark:bg-gray-700 dark:text-white`}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
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
                className={`border ${
                  errors.confirmPassword ? "border-red-500" : "border-gray-300"
                } dark:border-gray-700 dark:bg-gray-700 dark:text-white`}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
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
            <Label htmlFor="department" className="text-blue-800 dark:text-white">
              Department
            </Label>
            <Input
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={`border ${
                errors.department ? "border-red-500" : "border-gray-300"
              } dark:border-gray-700 dark:bg-gray-700 dark:text-white`}
            />
            {errors.department && (
              <p className="text-red-500 text-sm">{errors.department}</p>
            )}
          </div>

          {formData.role === "student" && (
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-blue-800 dark:text-white">
                Student ID (Optional)
              </Label>
              <Input
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="STU followed by 6 digits"
                className={`border ${
                  errors.studentId ? "border-red-500" : "border-gray-300"
                } dark:border-gray-700 dark:bg-gray-700 dark:text-white`}
              />
              {errors.studentId && (
                <p className="text-red-500 text-sm">{errors.studentId}</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Creating Account...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                Register
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Login here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegisterForm;
