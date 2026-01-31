import React from 'react';
import AuthLayout from '../layouts/AuthLayout';
import RegisterForm from '../features/auth/RegisterForm';

const RegisterPage = () => {
    return (
        <AuthLayout extraOrb={true}>
            <RegisterForm />
        </AuthLayout>
    );
};

export default RegisterPage;
