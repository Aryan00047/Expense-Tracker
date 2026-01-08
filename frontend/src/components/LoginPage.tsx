import { useState } from "react";
import { Link } from "react-router-dom";
import {FcBarChart, FcPlanner, FcSynchronize } from "react-icons/fc";
import { ArrowLeftIcon} from "@heroicons/react/24/outline";
import LoginCard from "./LoginCard";
import SignUpCard from "./SignUpCard";

const LoginPage = () => {

    const [authMode, setAuthMode] = useState<"login" | "signup">("login");
    
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 p-8 mt-24 justify-items-between">
                <div className="hidden md:flex md:flex-col p-6">
                    <div className="flex text-sm items-center text-gray-500 mb-2">
                        <Link to="/"><ArrowLeftIcon className="font-bold w-8 h-5 cursor-pointer"/></Link>
                        <h2 className="font-semibold">Back to home</h2>
                    </div>  
                    <div className="flex items-center mb-2">
                        <img
                            src="trending.svg"
                            alt="ExpenseFlow Logo"
                            className="w-10 h-10 mr-2"
                        />
                        <span className="text-lg font-semibold tracking-tight">
                            ExpenseFlow
                        </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                        <div className="max-w-md">
                            <h2 className="text-4xl font-semibold leading-tight mb-4">
                                Take Control of{" "}
                                <span className="text-purple-700">
                                Your Financial <span className="text-blue-600">Future</span>
                                </span>
                            </h2>
                            <p className="text-gray-700 text-base m-2">
                                Join ExpenseFlow today and start your journey to financial freedom!
                            </p>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2">
                                    <FcBarChart className="text-lg" />
                                    <span>Real-time expense tracking</span>
                                </li>

                                <li className="flex items-center gap-2">
                                    <FcPlanner className="text-lg" />
                                    <span>Smart budget management</span>
                                </li>

                                <li className="flex items-center gap-2">
                                    <FcSynchronize className="text-lg" />
                                    <span>Sync across all devices</span>
                                </li>
                            </ul>
                        </div>
                        
                    </div>
                </div>

                {/*second-col*/}
                <div className="p-6 rounded-lg border border-white shadow-2xl shadow-gray-400">
                    {authMode === "login" ? (
                        <LoginCard onSwitch={() => setAuthMode("signup")} />
                        ) : (
                        <SignUpCard onSwitch={() => setAuthMode("login")} />
                    )}
                </div>
            </div> 
        </>
    );
}

export default LoginPage;