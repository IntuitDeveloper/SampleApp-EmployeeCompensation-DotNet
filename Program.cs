using QuickBooks.EmployeeCompensation.API.Models;
using QuickBooks.EmployeeCompensation.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Configure URLs to run on port 5037
builder.WebHost.UseUrls("http://localhost:5037");

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddHttpClient();

// Add session support for OAuth state management
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax; // Better for popup OAuth flows
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

// Configure QuickBooks settings
var quickBooksConfig = new QuickBooksConfig();
builder.Configuration.GetSection("QuickBooks").Bind(quickBooksConfig);
builder.Services.AddSingleton(quickBooksConfig);

// Register services
builder.Services.AddScoped<IEmployeeCompensationService, EmployeeCompensationService>();
builder.Services.AddScoped<ITokenManagerService, TokenManagerService>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { 
        Title = "QuickBooks Employee Compensation API", 
        Version = "v1",
        Description = "API for managing QuickBooks Employee Compensation using GraphQL and Intuit .NET SDK"
    });
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Enable static files for the UI
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseSession();
app.UseAuthorization();
app.MapControllers();

app.Run();
