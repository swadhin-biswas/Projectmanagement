import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { faSpinner, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    department: "",
    specialization: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (user.role === "supervisor") {
        navigate("/supervisor/dashboard");
      } else {
        navigate("/student/dashboard");
      }
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const { confirmPassword, ...submissionData } = formData;

      if (formData.role === "student") {
        submissionData.studentId = `STU${Date.now().toString().slice(-5)}`;
      } else if (formData.role === "supervisor") {
        submissionData.supervisorId = `SUP${Date.now().toString().slice(-5)}`;
      }

      const result = await register(submissionData);
      if (result.success) {
        toast.success(
          formData.role === "supervisor"
            ? "Registration successful. Your account will be reviewed by an admin."
            : "Registration successful!"
        );
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
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
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-800 dark:text-white">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-blue-800 dark:text-white">
                Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                required
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
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
                type="text"
                placeholder="Computer Science"
                value={formData.department}
                onChange={handleChange}
                required
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {formData.role === "supervisor" && (
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
                  type="text"
                  placeholder="Machine Learning, Web Development, etc."
                  value={formData.specialization}
                  onChange={handleChange}
                  className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}

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
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
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
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={8}
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="pt-2">
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
            </div>
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
    </div>
  );
};

export default Register;
