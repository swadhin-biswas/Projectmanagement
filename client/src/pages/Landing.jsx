import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faChalkboardTeacher,
  faUserShield,
  faArrowRight,
  faFlask,
  faBook,
  faUsers,
  faChartLine,
  faAward,
  faGlobe
} from '@fortawesome/free-solid-svg-icons';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Hero Section with Animated Elements */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>

        <div className="container mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 py-24">
            <div className="flex-1 text-center lg:text-left">
              <Badge variant="outline" className="px-4 py-1 mb-6 text-sm font-medium rounded-full">
                Academic Excellence & Innovation
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                Project Management System
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
                Empowering academic excellence through advanced research collaboration and comprehensive project management
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link to="/login">
                  <Button className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 hover:scale-105 transition-all shadow-lg">
                    Get Started <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" className="text-lg px-8 py-6 border-2 hover:bg-primary/10 hover:scale-105 transition-all">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-xl blur opacity-25 animate-pulse"></div>
                <Card className="relative shadow-2xl border-0 bg-gradient-to-br from-card to-card/95">
                  <CardContent className="p-8">
                    <img
                      src="https://media.istockphoto.com/id/1754649058/vector/education-concept-brainstorm.jpg?s=612x612&w=0&k=20&c=dxc3FnAhlDR2RdaL8BGc5Th9Yk-hVNjwBIbnxvA83wk="
                      alt="University Management"
                      className="w-full h-auto rounded-lg"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">25k+</div>
              <div className="text-muted-foreground">Active Students</div>
            </div>
            <div className="p-6">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Research Projects</div>
            </div>
            <div className="p-6">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">95%</div>
              <div className="text-muted-foreground">Satisfaction Rate</div>
            </div>
            <div className="p-6">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">150+</div>
              <div className="text-muted-foreground">Partner Institutions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabbed Features Section */}
      <section className="py-20">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="px-4 py-1 mb-4 text-sm font-medium rounded-full">
              Comprehensive Platform
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tailored Solutions for Academic Excellence
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform offers specialized tools for all university stakeholders
            </p>
          </div>

          <Tabs defaultValue="research" className="w-full max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-10">
              <TabsTrigger value="research" className="text-lg py-3">Research</TabsTrigger>
              <TabsTrigger value="education" className="text-lg py-3">Education</TabsTrigger>
              <TabsTrigger value="administration" className="text-lg py-3">Administration</TabsTrigger>
            </TabsList>

            <TabsContent value="research" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <h3 className="text-2xl font-semibold mb-6 flex items-center">
                    <FontAwesomeIcon icon={faFlask} className="text-primary mr-3" />
                    Research Management
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faUsers} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Collaboration Tools</h4>
                        <p className="text-muted-foreground">Connect with researchers across departments and institutions seamlessly</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faChartLine} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Data Analysis Tools</h4>
                        <p className="text-muted-foreground">Advanced analytics for research data with visualization capabilities</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faBook} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Publication Tracking</h4>
                        <p className="text-muted-foreground">Manage research publications from submission to citation tracking</p>
                      </div>
                    </li>
                  </ul>
                </div>
                <Card className="overflow-hidden border-0 shadow-lg">
                  <CardContent className="p-0">
                    <img
                      src="/api/placeholder/500/300"
                      alt="Research Dashboard"
                      className="w-full h-auto"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="education" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <h3 className="text-2xl font-semibold mb-6 flex items-center">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-primary mr-3" />
                    Education Excellence
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faChalkboardTeacher} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Interactive Course Materials</h4>
                        <p className="text-muted-foreground">Engaging multimedia resources for enhanced learning experiences</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faAward} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Assessment Tools</h4>
                        <p className="text-muted-foreground">Comprehensive evaluation systems with detailed feedback mechanisms</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faUsers} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Discussion Forums</h4>
                        <p className="text-muted-foreground">Facilitate academic discourse between students and faculty members</p>
                      </div>
                    </li>
                  </ul>
                </div>
                <Card className="overflow-hidden border-0 shadow-lg">
                  <CardContent className="p-0">
                    <img
                      src="/api/placeholder/500/300"
                      alt="Education Dashboard"
                      className="w-full h-auto"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="administration" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <h3 className="text-2xl font-semibold mb-6 flex items-center">
                    <FontAwesomeIcon icon={faUserShield} className="text-primary mr-3" />
                    Administrative Efficiency
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faChartLine} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Advanced Analytics</h4>
                        <p className="text-muted-foreground">Comprehensive reporting and data visualization for informed decision-making</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faUsers} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">User Management</h4>
                        <p className="text-muted-foreground">Streamlined administration of faculty, staff, and student accounts</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-full mr-4 mt-1">
                        <FontAwesomeIcon icon={faGlobe} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Resource Allocation</h4>
                        <p className="text-muted-foreground">Efficient management of facilities, equipment, and academic resources</p>
                      </div>
                    </li>
                  </ul>
                </div>
                <Card className="overflow-hidden border-0 shadow-lg">
                  <CardContent className="p-0">
                    <img
                      src="/api/placeholder/500/300"
                      alt="Administration Dashboard"
                      className="w-full h-auto"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Research Projects Showcase */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="px-4 py-1 mb-4 text-sm font-medium rounded-full">
              Research Excellence
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Featured Research Projects
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover groundbreaking research supported by our platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Quantum Computing Applications",
                category: "Computer Science",
                image: "/api/placeholder/400/250"
              },
              {
                title: "Sustainable Energy Solutions",
                category: "Environmental Science",
                image: "/api/placeholder/400/250"
              },
              {
                title: "Advanced Medical Diagnostics",
                category: "Medical Research",
                image: "/api/placeholder/400/250"
              }
            ].map((project, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 border-0">
                <div className="relative">
                  <img src={project.image} alt={project.title} className="w-full h-48 object-cover" />
                  <Badge className="absolute top-3 right-3 bg-primary/90">{project.category}</Badge>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                  <p className="text-muted-foreground mb-4">
                    Innovative research exploring new frontiers in {project.category.toLowerCase()}.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    View Research Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button variant="outline" className="rounded-full px-8">
              View All Research Projects <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials with Scroll Animation */}
      <section className="py-20">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="px-4 py-1 mb-4 text-sm font-medium rounded-full">
              Success Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Academic Community Says
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hear from researchers, educators, and administrators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Dr. Emily Richardson",
                role: "Professor of Biology",
                quote: "The research collaboration tools have transformed how our department manages complex multi-institutional projects."
              },
              {
                name: "Prof. Michael Chen",
                role: "Department Chair, Computer Science",
                quote: "The analytics capabilities provide unprecedented visibility into student performance and research output metrics."
              },
              {
                name: "Dr. Sarah Johnson",
                role: "Associate Dean of Research",
                quote: "We've seen a 40% increase in successful grant applications since implementing this platform's tracking features."
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border border-muted shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className="text-primary text-4xl mb-4">❝</div>
                  <p className="text-lg mb-6 italic">
                    {testimonial.quote}
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold mr-4">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-medium">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with Advanced Styling */}
      <section className="py-16">
        <div className="container mx-auto">
          <Card className="border-0 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-95"></div>
              <CardContent className="relative z-10 p-12 md:p-16 text-center">
                <Badge variant="secondary" className="px-4 py-1 mb-6 text-sm font-medium rounded-full">
                  Join Our Academic Community
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                  Accelerate Your Academic Journey
                </h2>
                <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                  Transform research, education, and administration with our state-of-the-art university management system
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link to="/register">
                    <Button variant="secondary" size="lg" className="text-lg px-8 py-6 hover:scale-105 transition-transform shadow-lg">
                      Create Your Account
                    </Button>
                  </Link>
                  <Link to="/features">
                    <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white text-white hover:bg-white/20 hover:scale-105 transition-transform">
                      Explore All Features
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer with Enhanced Layout */}
      <footer className="bg-muted/40 pt-16 pb-8">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-lg font-bold mb-4">University System</h3>
              <p className="text-muted-foreground mb-4">
                Empowering academic excellence through innovative management tools
              </p>
              <div className="flex space-x-4">
                {['twitter', 'facebook', 'linkedin', 'github'].map(social => (
                  <a key={social} href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      <FontAwesomeIcon icon={faUsers} />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Solutions</h3>
              <ul className="space-y-2 text-muted-foreground">
                {['Research Management', 'Course Administration', 'Student Portal', 'Faculty Resources', 'Data Analytics'].map(item => (
                  <li key={item}><a href="#" className="hover:text-primary transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Resources</h3>
              <ul className="space-y-2 text-muted-foreground">
                {['Documentation', 'API Access', 'Knowledge Base', 'Community Forums', 'Video Tutorials'].map(item => (
                  <li key={item}><a href="#" className="hover:text-primary transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Contact Us</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>support@university-system.com</li>
                <li>+1 (555) 123-4567</li>
                <li>123 Academic Avenue</li>
                <li>University District, NY 10001</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-muted pt-8 flex flex-col md:flex-row justify-between items-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} University Management System. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;