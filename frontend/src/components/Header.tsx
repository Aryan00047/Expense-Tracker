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
        <div className="sticky top-0 z-20 border-b border-white/60 bg-white/75 px-4 py-3 backdrop-blur-xl sm:px-5">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <img src="/trending.svg" alt="Expense Tracker Logo" className="h-10 w-10 rounded-2xl bg-emerald-50 p-1.5 md:h-12 md:w-12"/>
                <div className="min-w-0">
                    <h1 className="truncate text-sm font-semibold text-slate-900 md:text-lg">ExpenseFlow</h1>
                    <p className="truncate text-xs text-slate-500">CSV expense analytics workspace</p>
                </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
            {items.map((item) => (
            <button
                className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 sm:flex-none md:text-sm"
                key={item.name}
                onClick={() => handleClick(item)}
            >
                {item.name}
            </button>
            ))}
        </div>
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
