'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, ShoppingCart, TrendingUp, Users, UserCircle } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/plan', label: 'Piano', icon: Calendar },
        { href: '/shopping', label: 'Spesa', icon: ShoppingCart },
        { href: '/summary', label: 'Noi', icon: Users },
        { href: '/tracker', label: 'Peso', icon: TrendingUp },
        { href: '/profile', label: 'Profilo', icon: UserCircle },
    ];

    return (
        <nav className="nav">
            {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                    <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
                        <Icon size={24} />
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
