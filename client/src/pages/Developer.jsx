const Developer = () => {
  const socialLinks = [
    {
      name: 'GitHub',
      url: 'https://github.com/swadhinbiswas',
      icon: '💻',
      color: 'hover:text-gray-400'
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/swadhin-biswas-329057225/',
      icon: '🔗',
      color: 'hover:text-blue-400'
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/swadhinbiswas',
      icon: '🐦',
      color: 'hover:text-blue-500'
    },
    {
      name: 'Email',
      url: 'mailto:swadhinbiswas.cse@gmail.com',
      icon: '📧',
      color: 'hover:text-red-400'
    }
  ];

  const skills = [
    'React.js', 'Node.js', 'Python', 'JavaScript', 'TypeScript',
    'MongoDB', 'PostgreSQL', 'Docker', 'AWS', 'Git',
    'Next.js', 'Express.js', 'TailwindCSS', 'Machine Learning'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16 animate-fadeIn">
          <img
            className="w-40 h-40 rounded-full mx-auto mb-8 border-4 border-blue-500 shadow-lg shadow-blue-500/50 animate-scaleIn"
            src="https://avatars.githubusercontent.com/u/94287447"
            alt="Swadhin Biswas"
          />
          <h1 className="text-4xl font-bold mb-4">Swadhin Biswas</h1>
          <p className="text-xl text-blue-300 mb-6">Full Stack Developer & ML Engineer</p>
          <div className="flex justify-center space-x-6 mb-8">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-2xl ${link.color} transition-all duration-300 hover:scale-110 active:scale-95`}
              >
                <span role="img" aria-label={link.name}>{link.icon}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 animate-fadeIn" style={{animationDelay: '0.3s'}}>

          <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">About Me</h2>
            <p className="text-gray-300 leading-relaxed">
              I'm a passionate Full Stack Developer and Machine Learning Engineer with a strong
              foundation in modern web technologies and artificial intelligence. Currently
              pursuing my degree in Computer Science and Engineering, I love building
              scalable applications and exploring new technologies.
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">Skills & Technologies</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Developer;
