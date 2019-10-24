前端文件上传细则
===
* 这里列出一些前端各类文件上传的方法和细节，用于记录。

<br>

## 一 前言
每次都会遇到小伙伴问上传的一些问题，故在此记录，温习复习。

<br>

## 二 本文涉及到的知识点
* 文件上传原理[点击跳转](#1)
* 最原始的文件上传[点击跳转](#2)
* 使用 koa2 作为服务器写一个文件上传接口[点击跳转](#3)
  * 单文件上传接口[点击跳转](#3-1)
  * 多文件上传接口[点击跳转](#3-2)
* 单文件、多文件上传以及上传进度查看[点击跳转](#4)
* 拖拽上传[点击跳转](#5)
* 剪贴板上传[点击跳转](#6)
* 大文件上传之分片上传[点击跳转](#7)
* 大文件上传之断点续传[点击跳转](#8)
* node 端文件上传[点击跳转](#9)

## 三 正文开始
### <span id="1">文件上传原理</span>

<br>

原理很简单，就是根据 http 协议的规范和定义，完成请求消息体的封装和消息体的解析，然后将二进制内容保存到文件。

我们都知道如果要上传一个文件，需要把 `form` 标签的 `enctype` 设置为 `multipart/form-data`，同时 `method` 必须为 `post` 方法。

那么 `multipart/form-data` 表示什么呢？

> multipart互联网上的混合资源，就是资源由多种元素组成，form-data表示可以使用HTML Forms 和 POST 方法上传文件，具体的定义可以参考RFC 7578。

`multipart/form-data` 结构
看下 `http` 请求的消息体：

![http请求的消息体](https://github.com/Zeeeping/zep.github.io/blob/master/assets/img/http.request.jpg)

* 请求头：
 `Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryDCntfiXcSkPhS4PN` 表示本次请求要上传的文件，其中 `boundary` 表示分隔符，如果要上传多个表单项，就需要使用 `boundary` 分割，每个表单项由------xxx开始，以------xxx结束。

 * 消息体 - Form Data 部分
  每一个表单项又由 `Content-Type` 和 `Content-Disposition` 组成。

  `Content-Type`：表示当前的内容的 MIME 类型，是图片还是文本还是二进制数据。

  `Content-Disposition: form-data` 为固定值，表示一个表单元素，`name` 表示表单元素的 名称，回车换行后面就是 `name` 的值，如果是上传文件就是文件的二进制内容。

  **解析**

  客户端发送请求到服务器后，服务器会收到请求的消息体，然后对消息体进行解析，解析出哪些是普通表单，哪些是附件。

  这里不能通过正则或者字符串处理分割后的内容，二进制 `buffer` 数据转化为 `string` 数据后，对字符串截取后，其索引和字符串是不一致的，除非上传的就是字符串。

  <br>

  不过一般情况下不需要自行解析，目前已经有很成熟的三方库可以使用，后面再说如何解析。

  <br>

### <span id="2">最原始的文件上传</span>

<br>

在 `ie` 的时代，就是最原始的文件上传的时代，想做一个无刷新文件上传的功能基本是靠 `iframe` 或者 flash 插件来实现。

方法是直接用 `form` 表单，直接上传，无需 `js`，没有兼容问题，上传会跳转，界面刷新，体验极差，数据丢失。

![最原始的上传代码](https://github.com/Zeeeping/zep.github.io/blob/master/assets/img/ie_form.png)

### <span id="3">文件上传接口</span>

<br>

服务端文件的保存基于现有的库 `koa-body` 配合 `koa2` 实现服务端文件的保存和数据的返回。

<br>

在项目开发中，文件上传这块本身独立性高，和业务耦合不高，代码基本上通用。

<br>

#### <span id="3-1">单文件上传接口</span>

`node`

    / *
      * 服务入口
      * /

      var http = require('http');
      var koaStatic = require('koa-static');
      var path = require('path');
      var koaBody = require('koa-body'); //文件保存库
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

      app.use(ctx => {
        var file = ctx.request.files.f1; // 文件对象
        var path = file.path; // 保存目录下得文件名
        var fname = file.name; // 原文件名称

        if (file.size > 0 && path) {
          // 得到扩展名
          var extArr = fname.split('.');
          var ext = extArr[extArr.length - 1];
          var nextPath = path + '.' + ext;

          // 重命名文件
          fs.renameSync(path, nextPath);
        }

        ctx.body = `{
          "fileUrl": "${uploadHost}${nextPath.slice(nextPath.lastIndexOf('/') + 1)}"
        }`
      })

      var server = http.createServer(app.callback());
      server.listen(port);

<br>

#### <span id="3-2">多文件上传接口</span>

`html` 多文件上传，`html` 部分添加 `multiple` 属性即可。

    选择文件: <input type="file" name="f1" multiple /> <br />

`node` 只需修改回调函数即可适应单文件以及多文件上传。

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
    });

<br>

#### <span id="3-3">无刷新上传</span>

无刷新上传文件要用到 `XMLHttpRequest`，在ie也有这个对象，但是只支持文本数据传输，无法用来读取和上传二进制数据。

现在已然升级到了 `XMLHttpRequest2`，可以读取和上传二进制数据，也可以使用 `FormData` 对象管理表单数据。

当然也可以使用 `fetch` 进行上传。

#####`index.html`

`html`

    <div>
      选择文件(可多选):
      <input type="file" id="f1" multiple/> <br />
      <button type="button" id="btn-submit">上 传</button>
    </div>

`xhr js`

    function upload() {
      // 获得文件对象列表，类数组类型。
      var file = document.getElementById('f1').files;

      if (!file.length) {
        alert('请选择文件！');
        return;
      }

      // 构建formdata对象
      var fData = new FormData();

      for (var key in file) {
        fData.append('f1', file[key]);
      }

      // 构建xhr对象
      var xhr = new XMLHttpRequest();

      // 记得建立与服务端的联系
      xhr.open('post', 'http://localhost:3000', true);

      // 把数据发送到服务端，发送时，Content-Type默认就是: multipart/form-data;
      xhr.send(fData);

      // xhr监听状态码变化的回调函数
      xhr.onreadystatechange = function () {
        console.log('state change', xhr.readyState);
        if (xhr.readyState === 4 && xhr.status === 200) {
          var obj = JSON.parse(xhr.responseText); // 拿到响应文本
          console.log(obj);
          if (obj.fileUrl.length) alert('上传成功！');
        }
      }
    }

    document.getElementById('btn-submit').addEventListener('click', upload);

#####`fetch.html`

`fetch js`

    function upload() {
      // ...前面一样，代码省略了。
      // 把构建xhr对象这块直接换成fetch

      // 服务器路径必须加上http或者https
      fetch('http://localhost:3000', {
        method: 'post',
        body: fData
      }).then(res => res.json()) // 没有括号，直接返回promise
        .then(res =>  {
          if (res.fileUrl.length) alert('上传成功！');
      }).catch(err => console.error('Error: ', err));
    }

### <span id="4">文件上传接口 之 上传进度查看</span>

#####`progress.html`

`html`

    <div>
      选择文件(可多选):
      <input type="file" id="f1" multiple /> <br />
      <div id="progress">
        <span class="red"></span>
      </div>
      <button type="button" id="btn-submit">上 传</button>
    </div>

`css`

    #progress {
      width: 300px;
      height: 20px;
    }

    #progress span {
      display: block;
      width: 0;
      height: 20px;
    }

    .red {
      background: red;
    }

    .green {
      background: green;
    }

`js`

    function upload() {
      // 获得进度条元素
      var progressSpan = document.getElementById('progress').firstElementChild;
      progressSpan.style.width = 0;
      progressSpan.classList.remove('green');

      // 获得文件对象列表，类数组类型。
      var file = document.getElementById('f1').files;

      if (!file.length) {
        alert('请选择文件！');
        return;
      }

      // 构建formdata对象
      var fData = new FormData();

      for (var key in file) {
        fData.append('f1', file[key]);
      }

      // 构建xhr对象
      var xhr = new XMLHttpRequest();

      // 记得建立与服务端的联系
      xhr.open('post', 'http://localhost:3000', true);

      xhr.onprogress = updateProgress; // 请求完成前周期性调用函数
      xhr.upload.onprogress = updateProgress;

      function updateProgress(event) {
        if (event.lengthComputable) {
          var completedPercent = (event.loaded / event.total * 100).toFixed(2);
          progressSpan.style.width = completedPercent + '%';
          progressSpan.innerHTML = completedPercent + '%';
          if (completedPercent > 90) { //进度条变色
            progressSpan.classList.add('green');
          }
          console.log('已上传', completedPercent);
        }
      }

      // 把数据发送到服务端，发送时，Content-Type默认就是: multipart/form-data;
      xhr.send(fData);

      // xhr监听状态码变化的回调函数
      xhr.onreadystatechange = function() {
        console.log('state change', xhr.readyState);
        if (xhr.readyState === 4 && xhr.status === 200) {
          var obj = JSON.parse(xhr.responseText); // 拿到响应文本
          console.log(obj);
          if (obj.fileUrl.length) alert('上传成功！');
        }
      }
    }

    document.getElementById('btn-submit').addEventListener('click', upload);