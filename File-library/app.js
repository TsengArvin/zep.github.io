var http = require('http');
var koaStatic = require('koa-static');
var path = require('path');
var koaBody = require('koa-body');
var fs = require('fs');
var Koa = require('koa2');

var app = new Koa();
var port = process.env.PORT || '3000';

var uploadHost = `http://localhost:${port}/uploads/`;

app.use(koaBody({
  formidable: {
    // 设置文件的默认保存目录，不设置则保存在系统临时目录下
    uploadDir: path.resolve(__dirname, './static/uploads')
  },
  multipart: true // 开启文件上传，默认是关闭
}));

// 开启静态文件访问
// 例如放在当前目录static中的localhost:3000/html/index.html
app.use(koaStatic(path.resolve(__dirname, './static')));

app.use(ctx => {
  var file = ctx.request.files.f1; // 文件对象
  var isArray = Array.isArray(file);
  var result = isArray ? [] : {};

  if (isArray) {
    file && file.forEach(item => {
      result.push(getExt(item));
    })
  } else {
    result = getExt(file);
  }

  function getExt(item) {
    var path = item.path; // 保存目录下得文件名
    var fname = item.name; // 原文件名称

    if (item.size > 0 && path) {
      // 得到扩展名
      var extArr = fname.split('.');
      var ext = extArr[extArr.length - 1];
      var nextPath = path + '.' + ext;

      // 重命名文件
      fs.renameSync(path, nextPath);
      return uploadHost + nextPath.slice(nextPath.lastIndexOf('/') + 1);
    }
  }

  ctx.body = `{
    "fileUrl": ${JSON.stringify(result)}
  }`;
})

var server = http.createServer(app.callback());
server.listen(port);