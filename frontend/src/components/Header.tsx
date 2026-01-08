import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";
import type { IHeaderItem, IHeaderProps } from "../models/LandingPageModel";

const Header = ({items}:IHeaderProps)=> {
    const navigate = useNavigate();
    const handleClick = async (item:IHeaderItem) => {
    if (item.name === "Logout") {
        try {
        await logoutUser();
        } catch (e) {
        console.error("Logout failed", e);
        } finally {
        localStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        }
    }

    navigate(item.link);
  };

    return(
        <div className="flex items-center justify-between p-2 m-2">
            <div className="flex ">
                <img src="/trending.svg" alt="Expense Tracker Logo" className="w-10 h-10 md:w-12 md:h-12"/>
                <h1 className="pt-3 text-sm md:text-lg">ExpenseFlow</h1>
            </div>
            <div className="flex gap-3">
            {items.map((item) => (
            <button
                className="rounded-2xl w-16 border border-gray-400 text-xs md:text-sm pb-0.5 hover:bg-purple-200"
                key={item.name}
                onClick={() => handleClick(item)}
            >
                {item.name}
            </button>
            ))}
        </div>
            {/* Mobile hamburger */}
            {/* <button
                className="md:hidden p-2 cursor-pointer"
                onClick={() => setOpen(prev => !prev)}
                aria-label="Open menu" >
            {open ? <XMarkIcon  className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button> */}
        </div>
    )
}

export default Header;