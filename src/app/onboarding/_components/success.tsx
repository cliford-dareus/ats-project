import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Success = ({ orgId }: { orgId: string | null }) => {
  const router = useRouter();
 
 useEffect(() => {
    if (!orgId) {
      router.push("/onboarding")
    }
  }, [router, orgId]);
   
  return (
    <div>
      <h1>Success!</h1>
      <p>You have successfully created an organization.</p>
    </div>
  );
};

export default Success;
