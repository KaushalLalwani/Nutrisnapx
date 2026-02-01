import { Link } from "react-router-dom";
import { Activity, Github, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-8 py-10 grid md:grid-cols-3 gap-8">
        
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Activity className="text-teal-600" />
            <span>NutriSnap</span>
          </div>
          <p className="text-sm text-slate-600">
            AI-powered meal analysis to help you eat smarter, every day.
          </p>
        </div>

        {/* Navigation */}
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-700">Quick Links</p>
          <ul className="space-y-1">
            <li>
              <Link to="/analyze" className="text-slate-600 hover:text-teal-600">
                Analyze Meal
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="text-slate-600 hover:text-teal-600">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/community" className="text-slate-600 hover:text-teal-600">
                Community
              </Link>
            </li>
            <li>
              <Link to="/profile" className="text-slate-600 hover:text-teal-600">
                Profile
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact / Social */}
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-700">Connect</p>

          <div className="flex gap-4">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 hover:text-teal-600"
              aria-label="GitHub"
            >
              <Github size={20} />
            </a>

            <a
              href="https://linkedin.com/"
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 hover:text-teal-600"
              aria-label="LinkedIn"
            >
              <Linkedin size={20} />
            </a>

            <a
              href="mailto:support@nutrisnap.ai"
              className="text-slate-600 hover:text-teal-600"
              aria-label="Email"
            >
              <Mail size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} NutriSnap. Built with ❤️ By Shawn Mendes.
      </div>
    </footer>
  );
}
