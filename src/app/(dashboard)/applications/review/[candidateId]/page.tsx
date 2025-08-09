import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {ChevronDown, MapPin, Mail, Phone} from "lucide-react";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";
import {get_user_applications} from "@/server/queries/drizzle/application";
import {get_candidate_with_details} from "@/server/queries/drizzle/candidates";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel, 
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

type Props = {
    params: {
        joblistingId: string
        candidateId: string
    }
};

const Page = async ({params}: Props) => {
    const {candidateId, joblistingId} = await params;
    
    const applications = await get_user_applications(Number(candidateId));
    const [candidate] = await get_candidate_with_details(Number(candidateId));

    if (!candidate || !applications) {
        return (
            <div className="p-4">
                <div className="text-center py-8">
                    <h2 className="text-xl font-semibold text-gray-900">Candidate not found</h2>
                    <p className="text-gray-500 mt-2">The candidate you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }
        
    return (
        <div className="p-4">
            <div className="mb-6">
                <h1 className="font-bold text-2xl text-gray-900">
                    Review Application
                </h1>
                <p className="text-gray-600 mt-1">
                    Reviewing {candidate.candidates.name}'s application for this position
                </p>
            </div>

            {/* Candidate Header Card */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                                <AvatarImage src="https://github.com/shadcn.png"/>
                                <AvatarFallback className="text-lg">
                                    {candidate?.candidates.name?.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-2">
                                <h2 className="text-xl font-semibold text-gray-900">{candidate?.candidates.name}</h2>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    {candidate?.candidates.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail size={14}/>
                                            <span>{candidate.candidates.email}</span>
                                        </div>
                                    )}
c                                        <div className="flex items-center gap-1">
                                            <Phone size={14}/>
                                            <span>{candidate.candidates.phone}</span>
                                        </div>
                                    )}
                                    {/*{candidate?.candidates.location && (*/}
                                    {/*    <div className="flex items-center gap-1">*/}
                                    {/*        <MapPin size={14}/>*/}
                                    {/*        <span>{candidate.candidates.location}</span>*/}
                                    {/*    </div>*/}
                                    {/*)}*/}
                                </div>
                                <Badge variant="secondary" className="w-fit">
                                    {candidate?.candidates.status || 'Active'}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <span>Advance</span>
                                        <ChevronDown size={16}/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Advance Candidate</DropdownMenuLabel>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem>Move to Interview</DropdownMenuItem>
                                    <DropdownMenuItem>Move to Offer</DropdownMenuItem>
                                    <DropdownMenuItem>Move to Hired</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="destructive" className="gap-2">
                                        <span>Reject</span>
                                        <ChevronDown size={16}/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Rejection Reasons</DropdownMenuLabel>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem>Not qualified</DropdownMenuItem>
                                    <DropdownMenuItem>Position filled</DropdownMenuItem>
                                    <DropdownMenuItem>Other</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs defaultValue="profile" className="w-full">
                <div className="border-b">
                    <TabsList className="bg-transparent rounded-none p-0 h-auto">
                        <CustomTabsTrigger 
                            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-500" 
                            value="profile"
                        >
                            Profile
                        </CustomTabsTrigger>
                        <CustomTabsTrigger 
                            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-500" 
                            value="resume"
                        >
                            Resume
                        </CustomTabsTrigger>
                        <CustomTabsTrigger 
                            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-500" 
                            value="applications"
                        >
                            Applications ({applications.length})
                        </CustomTabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-6">
                    <TabsContent value="profile" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Candidate Profile</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Name</label>
                                        <p className="mt-1 text-gray-900">{candidate?.candidates.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Email</label>
                                        <p className="mt-1 text-gray-900">{candidate?.candidates.email || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Phone</label>
                                        <p className="mt-1 text-gray-900">{candidate?.candidates.phone || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Status</label>
                                        <p className="mt-1 text-gray-900">{candidate?.candidates.status || 'Active'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="resume" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Resume</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {candidate?.candidates.cv_path ? (
                                    <object 
                                        data={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${candidate.candidates.cv_path}`}
                                        type="application/pdf" 
                                        width="100%" 
                                        height="600px"
                                        className="border rounded"
                                    >
                                        <p>
                                            Unable to display PDF. 
                                            <a 
                                                href={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${candidate.candidates.cv_path}`}
                                                className="text-blue-500 hover:underline ml-1"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Download PDF
                                            </a>
                                        </p>
                                    </object>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No resume uploaded
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="applications" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Application History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {applications.map((app: any) => (
                                        <div key={app.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{app.job_name}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{app.job_location}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Applied: {new Date(app.applied_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge 
                                                        variant="secondary"
                                                        style={{backgroundColor: app.stage_color + '20', color: app.stage_color}}
                                                    >
                                                        {app.current_stage}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {app.job_status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default Page;