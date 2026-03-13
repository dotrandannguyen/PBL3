import React from "react";
import AuthLayout from "@/layouts/AuthLayout";
import RegisterForm from "../components/RegisterForm";

export function RegisterPage() {
  return (
    <AuthLayout extraOrb={true}>
      <RegisterForm />
    </AuthLayout>
  );
}
