import { ArrowRightIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import Cards from "./Cards";
import { Feature_Cards } from "../config/featureCards";
import Footer from "./Footer";
import Header from "./Header";

const HomePage = () =>{
    // const [open, setOpen] = useState(false);
    // const links = ["Login"];
    const cards = Feature_Cards;
    const navigate = useNavigate();
    const header_items = [
        {
            name: 'Sign In',
            link: '/login'
        }
    ]
        return (<>
            <Header items={header_items}/> 
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] m-6 gap-6">
                    <div className="flex flex-col items-start max-w-xl justify-center gap-3 p-2">
                        <div className="inline-flex items-center px-4 py-2 m-2 rounded-full bg-purple-200 text-xs md:text-sm text-purple-700">
                            CSV-Powered Expense Analytics
                        </div>
                        <div className="p-2 space-y-2">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl leading-tight">
                                Upload Every Statement,{" "}
                                <span className="text-purple-700">
                                Understand Every <span className="text-blue-600">Trend</span>
                                </span>
                            </h2>
                            <p className="mt-2 text-xs sm:text-sm md:text-lg text-gray-600 leading-relaxed">
                                Turn exported bank and wallet CSV files into clear expense analytics,
                                category insights, and monthly spending patterns without manual entry.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 p-2">
                            <button className="inline-flex items-center gap-2 px-4 py-1.5 text-xs md:text-sm cursor-pointer font-medium rounded-full text-white bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition-colors"
                            onClick={() => navigate('/login')}>
                                Get Started Free <ArrowRightIcon className="w-3 h-3 translate-y-[1.5px]"/>
                            </button>
                            <button className="inline-flex hover:bg-gray-300 text-xs md:text-sm font-semibold cursor-pointer rounded-full px-4 py-1.5 border border-gray-600">Watch Demo</button>
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        <img className="w-full max-w-3xs md:max-w-sm object-contain rounded-2xl shadow-2xl" src="/landing_page.jpg" alt="Landing Page Image"/>
                    </div>
                    
                </div>
           </div>
           <div className="p-2 m-2 flex flex-col items-center text-center">
                <h2 className="text-2xl md:text-4xl mb-2">Everything You Need To Decode Spending</h2>
                <span className="text-xs md:text-lg">Powerful features that turn raw CSV exports into useful analytics</span>
           </div>

            <div className="max-w-6xl mx-auto">
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 sm:grid-cols-2 sm:justify-items-center gap-x-6 gap-y-4">
                        {cards.map((card) => (
                            <Cards key={card.id} title={card.title} description={card.description} icon={card.icon} color={card.color} />
                        ))}
                </div>
           </div>

           <div className="px-4 sm:px-6 lg:px-8 m-6">
                <div className="py-10 relative overflow-hidden mx-auto flex flex-col items-center justify-center text-center bg-linear-to-r from-purple-500 to-blue-500 w-full max-w-7xl rounded-2xl">
                        <h3 className="text-white inline-flex text-3xl md:text-5xl sm:text-4xl">Ready to Analyze Your Spend?</h3>
                        <span className="text-white inline-flex text-xs sm:text-sm md:text-lg mt-2">Import a CSV, see the pattern, and make sharper money decisions.</span>
                        <button className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full text-purple-700 bg-white hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate('/login')}>
                            Get Started Free <ArrowRightIcon className="w-3 h-3 translate-y-[1.5px]"/>
                        </button>
                        {/* Globe */}
                        <GlobeAltIcon className="absolute right-6 top-6 w-36 h-36 text-white/6 hidden md:block" />
                        
                </div>
           </div>
           <Footer/>
           
        </>
    )
};

export default HomePage;
