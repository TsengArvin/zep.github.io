前端文件上传细则
===
* 这里列出一些前端各类文件上传的方法和细节，用于记录。

<br>

## 一 前言
每次都会遇到小伙伴问上传的一些问题，故在此记录，温习复习。

<br>

## 二 本文涉及到的知识点
* 文件上传原理[点击跳转](#1)
* 最原始的文件上传
* 使用 koa2 作为服务器写一个文件上传接口
* 单文件、多文件上传以及上传进度查看
* 拖拽上传
* 剪贴板上传
* 大文件上传之分片上传
* 大文件上传之断点续传
* node 端文件上传

## 三 正文开始
<span id="1">文件上传原理</span>
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

<br>