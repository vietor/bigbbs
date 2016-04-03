BigBBS
========

一款中文精简BBS系统。

# 安装需求

## NodeJS
0.10.0版本以上

### 环境依赖

#### ImageMagick
用户“机器识别”的图片生成。

#### ghostscript
部分环境下ImageMagick或出现字体问题。

## Redis
2.6.12版本以上

## 支持的数据库

### PostgreSQL
9.2版本以上

### MySQL
5.5版本及以上

# 配置

详见config/default.json中的说明。

## 支持的avatar存储模式

### localfs (本地存储)

``` json
{
    "type": "localfs",
    "baseurl": "访问URL",
    "params": {
        "filepath": "本地存放路径"
    }
}
```

### qiniu (七牛云)

``` json
{
    "type": "qiniu",
    "baseurl": "访问URL",
    "params": {
        "url": "http://upload.qiniu.com/",
        "bucket": "bucket名",
        "accessKey": "访问KEY（AK）",
        "secretKey": "安全KEY（SK）"
    }
}
```

### aliyun (阿里云OSS)

``` json
{
    "type": "aliyun",
    "baseurl": "访问URL",
    "params": {
        "url": "bucket URL",
        "accessKeyId": "Access Key ID",
        "accessKeySecret": "Access Key Secret"
    }
}
```

# 开发

生成config/local.json进行配置，使用"gulp"配合完成开发。

# 发布

通过"gulp archive"进行打包生成"archive.zip"进行发布。
