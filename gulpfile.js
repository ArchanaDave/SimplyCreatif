// name of directory this file is in
const projectFolderName = 'code';

// require gulp
const gulp = require('gulp');

// require gulp plugins
const autoprefixer = require('gulp-autoprefixer'),
	browsersync  = require('browser-sync').create(),
	nunjucksRender = require('gulp-nunjucks-render'),
	htmlmin = require('gulp-htmlmin'),
	sass  = require('gulp-sass'),
	cleanCSS  = require('gulp-clean-css'),
	sourcemaps  = require('gulp-sourcemaps'),
	concat  = require('gulp-concat'),
	imagemin  = require('gulp-imagemin'),
	changed = require('gulp-changed'),
	uglify  = require('gulp-uglify'),
	lineec  = require('gulp-line-ending-corrector'),
	data = require('gulp-data'),
	mode = require('gulp-mode')(),
	fs = require('fs'),
	del = require('del');

const exec = require('child_process').exec; // run command-line programs from gulp
const execSync = require('child_process').execSync; // command-line reports

// project root path
const root  = '../' + projectFolderName + '/';

let deploymentPath = "";
if(mode.development()) {
	deploymentPath = "http://localhost:3000";
	// deploymentPath = "http://192.168.1.29:3000";
} else {
	deploymentPath = "https://simplycreatif.com";
}

const watchDevFiles = {
	html: root + 'app/*.html',
	njk: root + 'app/**/*.+(njk|nunjucks)',
	scss: root + 'app/scss/*.scss',
	css: root + 'app/css/*.css',
	js:  root + 'app/js/*.js',
	images: root + 'app/images/*.*'
};

const watchBuild = {
	html: root + 'build/**/*.html',
	css: root + 'build/css/*.css',
	js:  root + 'build/js/*.js',
	images: root + 'build/images/**/*.*'
};

const srcDirs = {
	html: root + 'build/**/',
	njk: root + 'app/pages/**/*',
	scss: root + 'app/scss/',
	css: root + 'app/css/',
	js: root + 'app/js/',
	images: root + 'app/images/**/*.*'
}

const buildDirs = {
	html: root + 'build',
	css: root + 'build/css/',
	js: root + 'build/js/',
	images: root + 'build/images/'
};

const distDirs = {
	html: root + 'dist/',
	css: root + 'dist/css/',
	js: root + 'dist/js/',
	images: root + 'dist/images/'
}

const jsDeps = [
	root + 'node_modules/popper.js/dist/umd/popper.min.js',
	// root + 'node_modules/jquery/dist/jquery.min.js',
	// root + 'node_modules/bootstrap/dist/js/bootstrap.min.js',
	root + 'app/vendor/validator.js',
	srcDirs.js + '*.js',
];

const scssIncludes = [
	'node_modules/bootstrap/scss/',
	'node_modules/reset-scss/',
	root + 'app/scss/fa/',
];


function html() {
	// Gets .html and .nunjucks files in pages
	let processed = gulp.src(srcDirs.njk + '*.+(html|njk|nunjucks)')
				// load portfolio data
				.pipe(data( () => JSON.parse(fs.readFileSync(root + 'site-data.json')) ))
				// Renders template with nunjucks
				.pipe(nunjucksRender({
					ext: '.html',
					inheritExtension: false,
					data: {
						host: deploymentPath,
					},
					path: [
						root + 'app/templates'
					]
				}))
				.pipe(mode.production(htmlmin({
					collapseWhitespace: true,
					minifyCSS: true,
					minifyJS: true,
					removeComments: true,
				})));

	if(mode.development()) {
		return processed.pipe(gulp.dest(buildDirs.html));
	} else {
		return processed.pipe(gulp.dest(distDirs.html));
	}
}

// generates css from scss files
function scss() {
	let processed = gulp.src([srcDirs.scss + 'styles.scss'], {allowEmpty: true})
				.pipe(mode.development(sourcemaps.init({loadMaps: true})))
				.pipe(sass({
					outputStyle: 'expanded',
					includePaths: scssIncludes
				}).on('error', sass.logError))
				.pipe(autoprefixer('last 2 versions'))
				.pipe(mode.development(sourcemaps.write()))
				.pipe(lineec());

	if(mode.development()) {
		return processed.pipe(gulp.dest(buildDirs.css));
	} else {
		return processed.pipe(gulp.dest(distDirs.css));
	}
}

function css() {
	let processed = gulp.src([root + 'app/css/styles.css', root + 'app/css/!(styles.css)*.css'])
						.pipe(mode.development(sourcemaps.init({loadMaps: true, largeFile: true})))
						.pipe(concat('styles.min.css'))
						.pipe(autoprefixer('last 2 versions'))
						.pipe(mode.production(cleanCSS()))
						.pipe(mode.development(sourcemaps.write('./maps/')))
						.pipe(lineec());

	if(mode.development()) {
		return processed.pipe(gulp.dest(buildDirs.css));
	} else {
		return processed.pipe(gulp.dest(distDirs.css));
	}
}

function js() {
	let processed = gulp.src(jsDeps, {allowEmpty: true})
				.pipe(concat('script.min.js'))
				// .pipe(mode.development(uglify()))
				.pipe(lineec())
				
	if(mode.development()) {
		return processed.pipe(gulp.dest(buildDirs.js));
	} else {
		return processed.pipe(gulp.dest(distDirs.js));
	}
}

function img() {
	let processed = gulp.src(srcDirs.images)
					// .pipe(changed(distDirs.images))
					.pipe(mode.production(
						imagemin([
							imagemin.gifsicle({interlaced: true}),
							imagemin.jpegtran({progressive: true}),
							imagemin.optipng({optimizationLevel: 5})
						])
					));

	if(mode.development()) {
		return processed.pipe(gulp.dest(buildDirs.images));
	} else {
		return processed.pipe(gulp.dest(distDirs.images));
	}
}

function watch() {
	gulp.watch(watchDevFiles.njk, html);
	gulp.watch(watchDevFiles.scss, scss);
	gulp.watch(watchDevFiles.images, img);
	gulp.watch(watchDevFiles.js, js);
	gulp.watch([
		watchBuild.html,
		watchBuild.css,
		watchBuild.js,
		watchBuild.images
	]).on('change', browsersync.reload);
}

function browserSync(done) {
	browsersync.init({
		open: false,
		server: {
			baseDir: root + "build/"
		}
	});
	done();
}

function clean_build() {
	return del([
		root + "build/"
	]);
}

function clean_dist() {
	return del([
		root + "dist/"
	]);
}

function init_build() {
	return gulp.src([root + 'app/vendor/**/*', root + 'app/webfonts/**/*', root + 'app/icons/**/*'], { base: 'app' })
				.pipe(gulp.dest(root + 'build/'));
}

function init_dist() {
	return gulp.src([root + 'app/vendor/**/*', root + 'app/webfonts/**/*', root + 'app/icons/**/*'], { base: 'app' })
				.pipe(gulp.dest(root + 'dist/'));
}

const build = gulp.series(clean_build, gulp.parallel(init_build, html, scss, js, img));
const buildAndWatch = gulp.series(build, gulp.parallel(watch, browserSync));
gulp.task('default', buildAndWatch);

// const dist = gulp.parallel(html, gulp.series(css, concatCSS), concatJS, imgmin);
gulp.task('dist', gulp.series(clean_dist, init_dist, gulp.parallel(html, scss, js, img)));


// Commit and push files to Git
function git(done) {
    return exec('git add . && git commit -m "netlify deploy" && git push');
    done();
}

// Watch for netlify deployment
function netlify(done) {
    return new Promise(function(resolve, reject) {
        console.log(execSync('netlify watch').toString());
        resolve();
    });
}

// Preview Deployment
function netlifyOpen(done) {
    return exec('netlify open:site');
    done();
}


exports.html = html
exports.scss = scss;
exports.css = css;
exports.js = js;
exports.img = img;
exports.watch = watch;

exports.build = build;
exports.init_build = init_build;
exports.buildAndWatch = buildAndWatch;
exports.clean_build = clean_build;

exports.init_dist = init_dist;
exports.clean_dist = clean_dist;

// Deploy command
exports.deploy = gulp.series(git, netlify, netlifyOpen);
