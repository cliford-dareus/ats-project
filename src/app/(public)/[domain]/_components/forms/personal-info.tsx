import { User } from "lucide-react";
import { motion } from "framer-motion";
import { FormInput } from "../fields";
import { Card } from "@/components/ui/card";

const PersonalInfoForm = ({ register, errors }) => {
    return (
        <motion.div
            key="step1"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <Card className="p-8">
                <div className="flex items-center gap-2 mb-6">
                    <User className="h-5 w-5 text-black" />
                    <h2 className="text-xl font-bold">Personal Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="First Name"
                        placeholder="Jane"
                        {...register("personalInfo.firstName")}
                        error={errors.personalInfo?.firstName?.message}
                    />
                    <FormInput
                        label="Last Name"
                        placeholder="Doe"
                        {...register("personalInfo.lastName")}
                        error={errors.personalInfo?.lastName?.message}
                    />
                    <FormInput
                        label="Email Address"
                        type="email"
                        placeholder="jane@example.com"
                        {...register("personalInfo.email")}
                        error={errors.personalInfo?.email?.message}
                    />
                    <FormInput
                        label="Phone Number"
                        placeholder="(555) 000-0000"
                        {...register("personalInfo.phone")}
                        error={errors.personalInfo?.phone?.message}
                    />
                    <div className="md:col-span-2">
                        <FormInput
                            label="Street Address"
                            placeholder="123 Success Ave"
                            {...register("personalInfo.address")}
                            error={errors.personalInfo?.address?.message}
                        />
                    </div>
                    <FormInput
                        label="City"
                        placeholder="San Francisco"
                        {...register("personalInfo.city")}
                        error={errors.personalInfo?.city?.message}
                    />
                    <FormInput
                        label="State / Province"
                        placeholder="CA"
                        {...register("personalInfo.state")}
                        error={errors.personalInfo?.state?.message}
                    />
                    <FormInput
                        label="Zip / Postal Code"
                        placeholder="94103"
                        {...register("personalInfo.zipCode")}
                        error={errors.personalInfo?.zipCode?.message}
                    />
                    <FormInput
                        label="Portfolio URL"
                        placeholder="https://mywork.com"
                        {...register("personalInfo.portfolioUrl")}
                        error={errors.personalInfo?.portfolioUrl?.message}
                    />
                    <FormInput
                        label="LinkedIn URL"
                        placeholder="https://linkedin.com/in/username"
                        {...register("personalInfo.linkedinUrl")}
                        error={errors.personalInfo?.linkedinUrl?.message}
                    />
                </div>
            </Card>
        </motion.div>
    );
};

export default PersonalInfoForm;
