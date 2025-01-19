import {auth} from "@clerk/nextjs/server";

const Page = async () => {
    const {userId} = await auth()

    return (
        <div className="md:p-4">
            <button>Fetch Available Slots</button>
        </div>
    )
};

export default Page;